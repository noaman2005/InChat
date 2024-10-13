// pages/_app.js
import React from 'react';

import '../styles/globals.css'; // Import global CSS (including Tailwind CSS)

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
