import React from 'react';
import ReactDOM from 'react-dom';
import ChatWidget from './ChatWidget';

// Get configuration from script tag data attributes
const scriptTag = document.currentScript || (function() {
  const scripts = document.getElementsByTagName('script');
  return scripts[scripts.length - 1];
})();

// Extract configuration
const config = {
  serverUrl: scriptTag.getAttribute('data-server-url') || 'wss://your-websocket-server.com',
  userId: scriptTag.getAttribute('data-user-id'),
  sessionId: scriptTag.getAttribute('data-session-id'),
  primaryColor: scriptTag.getAttribute('data-primary-color') || '#0084ff',
  secondaryColor: scriptTag.getAttribute('data-secondary-color') || '#f0f0f0',
  title: scriptTag.getAttribute('data-title') || 'Customer Support',
  welcomeMessage: scriptTag.getAttribute('data-welcome-message') || 'Hello! How can I help you today?'
};

// Create container for the widget
const widgetContainer = document.createElement('div');
widgetContainer.id = 'ai-customer-support-widget';
document.body.appendChild(widgetContainer);

// Render the widget
ReactDOM.render(
  <React.StrictMode>
    <ChatWidget 
      serverUrl={config.serverUrl}
      userId={config.userId}
      sessionId={config.sessionId}
      primaryColor={config.primaryColor}
      secondaryColor={config.secondaryColor}
      title={config.title}
      welcomeMessage={config.welcomeMessage}
    />
  </React.StrictMode>,
  widgetContainer
);

// Export ChatWidget for direct usage
export default ChatWidget;
