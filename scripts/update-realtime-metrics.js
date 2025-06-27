const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.example' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMetrics() {
  const metrics = [
    'revenue',
    'revenueGrowth',
    'orders',
    'ordersGrowth',
    'conversion',
    'conversionGrowth',
    'visitors',
    'visitorsGrowth',
  ];

  for (const metric of metrics) {
    const { data, error } = await supabase
      .from('realtime_metrics')
      .select('value')
      .eq('metric_name', metric)
      .single();

    if (error) {
      console.error(`Error fetching metric ${metric}:`, error);
      continue;
    }

    const newValue = data.value + (Math.random() - 0.5) * (data.value * 0.1);

    await supabase
      .from('realtime_metrics')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('metric_name', metric);
  }

  console.log('Updated real-time metrics');
}

setInterval(updateMetrics, 3000);

console.log('Started real-time metrics updater');
