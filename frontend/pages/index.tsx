import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Dive 1', score: 45 },
  { name: 'Dive 2', score: 52 },
  { name: 'Dive 3', score: 48 },
  { name: 'Dive 4', score: 60 },
  { name: 'Dive 5', score: 55 },
  { name: 'Dive 6', score: 65 },
];

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Diving Analytics Platform</h1>
      <div style={{ width: '100%', height: 400 }}>
        <h3>Competition Progress</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
