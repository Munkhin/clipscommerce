CREATE TABLE realtime_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(255) NOT NULL,
  value FLOAT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO realtime_metrics (metric_name, value) VALUES
('revenue', 0),
('revenueGrowth', 0),
('orders', 0),
('ordersGrowth', 0),
('conversion', 0),
('conversionGrowth', 0),
('visitors', 0),
('visitorsGrowth', 0);
