import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './print.css'; // 📄 INTERPRATIONAL PRINT CANVAS RULEBOOK LINKED 

import cloudLogoImg from './services/CloudLogo.png';

// ⭐ CIRCULAR FAVICON GENERATOR (Round White Badge Fix)
const createCircularFavicon = (imageSrc: string) => {
  const img = new Image();
  img.src = imageSrc;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const size = 64; // High resolution Favicon canvas
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White Circle Background Draw
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Draw Logo Inside the White Badge
      const padding = 8;
      ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);

      // Set To Favicon Link
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.type = 'image/png';
      link.href = canvas.toDataURL('image/png');
    }
  };
};

// Set Round Badge Icon
createCircularFavicon(cloudLogoImg);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);