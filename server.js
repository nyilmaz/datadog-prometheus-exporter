import http from 'http';
import promClient, {register} from 'prom-client';
import Metrics from "./metrics.js";

const PORT = 8080;
if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length - 1];
    };
}

function checkEnv() {
    const env = process.env;
    if (!(env['DD_SITE'] && env['DD_APP_KEY'] && env['DD_API_KEY'])) {
        console.error('DD_SITE, DD_APP_KEY, DD_API_KEY environment variables must all be provided');
        process.exit(-1);
    }
}

const gauges = {
    get(metric) {
        const cached = this[metric.name];
        if (cached) {
            return cached;
        }
        return this[metric.name] = new promClient.Gauge(metric);
    }
};
const metrics = new Metrics();
promClient.collectDefaultMetrics();

function fetchMetrics() {
    return Promise.all([
        metrics.datadogMetrics().spans(),
        metrics.datadogMetrics().logs(),
        metrics.datadogMetrics().sds(),
        metrics.datadogMetrics().infra_hosts(),
        metrics.datadogMetrics().rum(),
    ])
        .then(metrics => metrics.forEach(metric => gauges.get(metric).set(metric.value)));
}

async function handle(request, response) {
    switch (request.url) {
        case '/health':
            writeEnd(response, 'OK');
            break;
        case '/prometheus':
            await fetchMetrics();
            writeEnd(response, await register.metrics());
            break;
        default:
            writeEnd(response, `"${request.url}" is not handled`, 404);
            break;
    }
}

const server = http.createServer(handle);

function writeEnd(response, out, statusCode = 200) {
    response.writeHead(statusCode);
    response.end(out);
}
checkEnv();
console.info(`Server started with port: ${PORT}`);
server.listen(PORT);