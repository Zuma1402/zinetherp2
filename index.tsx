import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './print.css'; // 📄 INTERPRATIONAL PRINT CANVAS RULEBOOK LINKED 

// ⭐ DYNAMIC FAVICON SETTER (Browser Tab Logo Fix)
import cloudLogoImg from './services/CloudLogo.png';

const setFavicon = (iconUrl: string) => {
  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.type = 'image/png';
  link.href = iconUrl;
};

// Application load hotey hi browser tab ka icon change ho jayega
setFavicon(cloudLogoImg);

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