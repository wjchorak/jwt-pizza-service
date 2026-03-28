const config = require('./config');

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: req.body,
        resBody: resBody,
      };
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, 'http', logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };

  log(level, type, logData) {
    const labels = { component: config.logs.source, level: level, type: type };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    const SENSITIVE_KEYS = ['password', 'token', 'jwt', 'authorization'];

    const scrub = (val, keyName = '') => {
      if (val === null || val === undefined) return val;

      if (typeof val === 'string') {
        const trimmed = val.trim();
        
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(val);
            return JSON.stringify(scrub(parsed, keyName));
          } catch (e) {
            console.log(e);
          }
        }

        const lowKey = keyName.toLowerCase();
        if (SENSITIVE_KEYS.includes(lowKey)) return '*****';
        
        if (val.startsWith('$2a$') || val.startsWith('$2b$') || val.startsWith('$2y$')) return '*****';

        if (keyName === 'params' && val.length > 10) return '*****';

        return val;
      }

      if (Array.isArray(val)) {
        return val.map(item => scrub(item, keyName));
      }

      if (typeof val === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(val)) {
          cleaned[k] = scrub(v, k);
        }
        return cleaned;
      }

      return val;
    };

    return JSON.stringify(scrub(logData));
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logs.endpointUrl}`, {
      method: 'post',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logs.accountId}:${config.logs.apiKey}`,
      },
    }).then((res) => {
      if (!res.ok) console.log('Failed to send log to Grafana');
    });
  }
}
module.exports = new Logger();