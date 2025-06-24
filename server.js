import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());

// Replace with your ServiceNow credentials and instance
const SNOW_INSTANCE = 'https://your-instance.service-now.com';
const SNOW_USERNAME = 'your-username';
const SNOW_PASSWORD = 'your-password';

app.get('/status/:appName', async (req, res) => {
  const appName = req.params.appName;
  try {
    const response = await axios.get(
      `${SNOW_INSTANCE}/api/now/table/cmdb_ci_application?sysparm_query=name=${appName}`,
      {
        auth: {
          username: SNOW_USERNAME,
          password: SNOW_PASSWORD,
        },
        headers: {
          Accept: 'application/json',
        },
      }
    );
    const status = response.data.result[0]?.status?.toLowerCase() || 'unknown';
    res.json({ status });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ status: 'unknown' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend proxy server running at http://localhost:${PORT}`);
});
