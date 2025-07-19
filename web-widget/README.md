# AI Customer Support Web Widget

An embeddable web chat widget for the AI Customer Support Platform that allows customers to interact with the AI chatbot directly from any website.

## Features

- Real-time chat interface using WebSockets
- Voice message recording and transcription
- Customizable appearance (colors, title, welcome message)
- Responsive design for mobile and desktop
- Handover to human agent functionality
- Typing indicators and connection status
- Easy integration with a single script tag

## Installation

### As a dependency in your project

```bash
npm install ai-customer-support-widget
```

Then import and use the component:

```javascript
import ChatWidget from 'ai-customer-support-widget';
import 'ai-customer-support-widget/dist/widget.css';

// Render the component
ReactDOM.render(
  <ChatWidget 
    serverUrl="wss://your-websocket-server.com"
    primaryColor="#0084ff"
    title="Customer Support"
  />,
  document.getElementById('chat-container')
);
```

### Via CDN / Direct Script Tag

Add the following script tag to your HTML:

```html
<script 
  src="https://your-cdn.com/widget.js" 
  data-server-url="wss://your-websocket-server.com"
  data-primary-color="#0084ff"
  data-secondary-color="#f0f0f0"
  data-title="Customer Support"
  data-welcome-message="Hello! How can I help you today?">
</script>
```

## Configuration Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-server-url` | String | - | WebSocket server URL (required) |
| `data-user-id` | String | null | User identifier (optional) |
| `data-session-id` | String | null | Session identifier (optional) |
| `data-primary-color` | String | "#0084ff" | Primary color for theming |
| `data-secondary-color` | String | "#f0f0f0" | Secondary color for theming |
| `data-title` | String | "Customer Support" | Widget title |
| `data-welcome-message` | String | "Hello! How can I help you today?" | Initial welcome message |

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## WebSocket Communication Protocol

The widget communicates with the server using the following message types:

### Outgoing Messages (Client to Server)

- **Text Message**:
  ```json
  {
    "type": "text",
    "text": "Hello, I need help with my order",
    "id": "msg-1234567890",
    "timestamp": "2023-07-19T14:00:00.000Z"
  }
  ```

- **Audio Message**:
  ```json
  {
    "type": "audio",
    "audio": "base64EncodedAudioData...",
    "format": "mp3",
    "id": "audio-1234567890",
    "timestamp": "2023-07-19T14:05:00.000Z"
  }
  ```

- **Handover Request**:
  ```json
  {
    "type": "handover_request",
    "timestamp": "2023-07-19T14:10:00.000Z"
  }
  ```

### Incoming Messages (Server to Client)

- **Connection Established**:
  ```json
  {
    "type": "connection_established",
    "connectionId": "conn-1234567890",
    "userId": "user123",
    "sessionId": "session456",
    "message": "Connected to AI Customer Support",
    "timestamp": "2023-07-19T14:00:00.000Z"
  }
  ```

- **AI Message**:
  ```json
  {
    "type": "message",
    "text": "I'd be happy to help with your order. Could you please provide your order number?",
    "messageId": "ai-1234567890",
    "timestamp": "2023-07-19T14:00:10.000Z",
    "sender": "ai"
  }
  ```

- **Typing Indicators**:
  ```json
  { "type": "typing_start", "timestamp": "2023-07-19T14:00:05.000Z" }
  { "type": "typing_stop", "timestamp": "2023-07-19T14:00:10.000Z" }
  ```

- **Transcription**:
  ```json
  {
    "type": "transcription",
    "text": "I need help with my recent purchase",
    "timestamp": "2023-07-19T14:05:05.000Z"
  }
  ```

- **Handover**:
  ```json
  {
    "type": "handover_initiated",
    "message": "Connecting you with a human agent...",
    "timestamp": "2023-07-19T14:10:05.000Z"
  }
  ```

- **Error**:
  ```json
  {
    "type": "error",
    "message": "Failed to process your message",
    "timestamp": "2023-07-19T14:15:00.000Z"
  }
  ```

## Integration with Channel Integrations Service

This widget connects to the Channel Integrations Service WebSocket server to communicate with the AI chatbot. The service handles message routing, AI processing, and handover to human agents when necessary.

## Browser Compatibility

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Opera (latest 2 versions)
- Mobile browsers (iOS Safari, Android Chrome)
