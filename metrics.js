import {client, v1} from "@datadog/datadog-api-client";

export default function Metrics() {
    function datadogMetrics() {

        const configuration = client.createConfiguration();
        const apiInstance = new v1.MetricsApi(configuration);

        function deduceMetricName(metric) {
            return metric.substring(metric.indexOf('.') + 1, metric.indexOf('{')).replaceAll('.', '_');
        }

        const fetcher = (query) => (function getDatadogMetric() {
            const now = new Date();
            // get from the start of the month
            const params = {
                from: Math.round((new Date(now.getFullYear(), now.getMonth())) / 1000),
                to: Math.round(new Date().getTime() / 1000),
                query
            };
            return apiInstance
                .queryMetrics(params)
                .then(data => data.series[0])
                .then(series => ({
                        value: series.pointlist.last().last(),
                        name: `billing_datadog_${deduceMetricName(series.expression)}`,
                        help: `${series.expression}`
                    })
                )
                .catch((error) => console.error(error));
        });

        return {
            spans: fetcher('cumsum(sum:datadog.estimated_usage.apm.ingested_spans{*}.as_count())'),
            logs: fetcher('cumsum(sum:datadog.estimated_usage.logs.ingested_events{*}.as_count())'),
            infra_hosts: fetcher('sum:datadog.estimated_usage.hosts{*}'),
            sds: fetcher('cumsum(sum:datadog.estimated_usage.sds.scanned_bytes{*}.as_count())'),
            rum: fetcher('cumsum(sum:datadog.estimated_usage.rum.sessions{*}.as_count())'),
        }

    }

    return {
        datadogMetrics
    }


}

