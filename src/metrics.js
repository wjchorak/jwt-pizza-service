const config = require('./config');
const { DB } = require('./database/database.js');
const os = require('os');

const requests = {};

const pizzaMetrics = {
  revenue: 0,
  latencyTotal: 0,
  successCount: 0,
  failureCount: 0
};

const authMetrics = {
  success: 0,
  failure: 0
}

function requestTracker(req, res, next) {
  const endpoint = `[${req.method}] ${req.path}`;
  const startTime = Date.now();

  if (!requests[endpoint]) {
    requests[endpoint] = { count: 0, reqLatency: 0 };
  }

  requests[endpoint].count += 1;

  res.on('finish', () => {
    const latency = Date.now() - startTime;
    requests[endpoint].reqLatency += latency;
  });

  next();
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function pizzaPurchase(success, latency, price) {
  if(success) {
    pizzaMetrics.revenue += price;
    pizzaMetrics.latencyTotal += latency;
    pizzaMetrics.successCount += 1;
  }
  else {
    pizzaMetrics.failureCount += 1;
  }
}

function authResult(success) {
  if(success) authMetrics.success += 1;
  else authMetrics.failure += 1;
}

setInterval(async () => {
  const metrics = [];
  Object.keys(requests).forEach((endpoint) => {
    const endpointMetrics = requests[endpoint];

    metrics.push(createMetric('requests', endpointMetrics.count, '1', 'sum', 'asInt', { endpoint }));

    metrics.push(createMetric('endpointLatency', endpointMetrics.reqLatency, 'ms', 'sum', 'asDouble', { endpoint }));
  });

  metrics.push(createMetric('cpuUsagePercentage', getCpuUsagePercentage(), '%', 'gauge', 'asDouble'));

  metrics.push(createMetric('memoryUsagePercentage', getMemoryUsagePercentage(), '%', 'gauge', 'asDouble'));

  metrics.push(createMetric('pizzaSold', pizzaMetrics.successCount, '1', 'sum', 'asInt'));

  metrics.push(createMetric('pizzaRevenue', pizzaMetrics.revenue, 'BTC', 'sum', 'asDouble'));

  metrics.push(createMetric('pizzaLatency', pizzaMetrics.latencyTotal, 'ms', 'sum', 'asInt'));

  metrics.push(createMetric('pizzaFails', pizzaMetrics.failureCount, '1', 'sum', 'asInt'));

  metrics.push(createMetric('authSuccess', authMetrics.success, '1', 'sum', 'asInt'));

  metrics.push(createMetric('authFail', authMetrics.failure, '1', 'sum', 'asInt'));

  const activeUsers = await DB.getActiveUserCount();

  metrics.push(createMetric('activeUsers', activeUsers, '1', 'gauge', 'asInt'));

  sendMetricToGrafana(metrics);
}, 5000);

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if(metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
};

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        resource: { attributes: [] },
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.endpointUrl}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`, 'Content-Type': 'application/json'}
  })
    .then((response) => {
      if(!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker, pizzaPurchase, authResult };