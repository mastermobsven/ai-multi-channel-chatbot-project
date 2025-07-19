import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

/**
 * AI Customer Support Chat Widget Component
 * 
 * @param {Object} props
 * @param {string} props.serverUrl - WebSocket server URL
 * @param {string} props.userId - Optional user ID
 * @param {string} props.sessionId - Optional session ID
 * @param {string} props.primaryColor - Primary color for theming
 * @param {string} props.secondaryColor - Secondary color for theming
 * @param {string} props.title - Chat widget title
 * @param {string} props.welcomeMessage - Initial welcome message
 * @param {Function} props.onClose - Callback when widget is closed
 */
const ChatWidget = ({
  serverUrl = 'wss://your-websocket-server.com',
  userId = null,
  sessionId = null,
  primaryColor = '#0084ff',
  secondaryColor = '#f0f0f0',
  title = 'Customer Support',
  welcomeMessage = 'Hello! How can I help you today?',
  onClose = () => {}
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionId, setConnectionId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  
  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Connect to WebSocket server
  useEffect(() => {
    if (isOpen && !isConnected) {
      connectWebSocket();
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isOpen]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Apply custom colors
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
  }, [primaryColor, secondaryColor]);
  
  // Connect to WebSocket server
  const connectWebSocket = () => {
    try {
      // Construct WebSocket URL with query parameters
      let wsUrl = serverUrl;
      const params = new URLSearchParams();
      
      if (userId) params.append('userId', userId);
      if (sessionId) params.append('sessionId', sessionId);
      
      // Add query parameters if any exist
      if (params.toString()) {
        wsUrl += `?${params.toString()}`;
      }
      
      // Create WebSocket connection
      socketRef.current = new WebSocket(wsUrl);
      
      // Connection opened
      socketRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connection established');
      };
      
      // Listen for messages
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
      };
      
      // Connection closed
      socketRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket connection closed');
        
        // Try to reconnect after a delay
        setTimeout(() => {
          if (isOpen) {
            connectWebSocket();
          }
        }, 3000);
      };
      
      // Connection error
      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };
  
  // Handle incoming WebSocket messages
  const handleIncomingMessage = (data) => {
    switch (data.type) {
      case 'connection_established':
        setConnectionId(data.connectionId);
        // Add welcome message
        setMessages([
          {
            id: 'welcome',
            text: welcomeMessage,
            sender: 'ai',
            timestamp: new Date().toISOString()
          }
        ]);
        break;
        
      case 'message':
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: data.messageId || `msg-${Date.now()}`,
            text: data.text,
            sender: 'ai',
            timestamp: data.timestamp || new Date().toISOString()
          }
        ]);
        break;
        
      case 'typing_start':
        setIsTyping(true);
        break;
        
      case 'typing_stop':
        setIsTyping(false);
        break;
        
      case 'transcription':
        // Show transcription as user message
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: `transcription-${Date.now()}`,
            text: data.text,
            sender: 'user',
            isTranscription: true,
            timestamp: data.timestamp || new Date().toISOString()
          }
        ]);
        break;
        
      case 'handover_initiated':
        // Show handover message
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: `handover-${Date.now()}`,
            text: data.message || 'Connecting you with a human agent...',
            sender: 'system',
            timestamp: data.timestamp || new Date().toISOString()
          }
        ]);
        break;
        
      case 'error':
        // Show error message
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: `error-${Date.now()}`,
            text: data.message || 'An error occurred',
            sender: 'system',
            isError: true,
            timestamp: data.timestamp || new Date().toISOString()
          }
        ]);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };
  
  // Send a text message
  const sendMessage = () => {
    if (!inputText.trim() || !isConnected) return;
    
    const messageId = `msg-${Date.now()}`;
    
    // Add message to UI
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: messageId,
        text: inputText,
        sender: 'user',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Send message to server
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'text',
        text: inputText,
        id: messageId,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Clear input
    setInputText('');
  };
  
  // Handle input key press (send on Enter)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/mp3' });
        await sendAudioMessage(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      recorder.start();
      setAudioRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `error-${Date.now()}`,
          text: 'Could not access microphone. Please check permissions.',
          sender: 'system',
          isError: true,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (audioRecorder) {
      audioRecorder.stop();
      setIsRecording(false);
    }
  };
  
  // Send audio message
  const sendAudioMessage = async (audioBlob) => {
    if (!isConnected) return;
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data URL prefix
        
        // Send audio to server
        if (socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio,
            format: 'mp3',
            id: `audio-${Date.now()}`,
            timestamp: new Date().toISOString()
          }));
        }
      };
    } catch (error) {
      console.error('Error sending audio message:', error);
    }
  };
  
  // Request handover to human agent
  const requestHandover = () => {
    if (!isConnected) return;
    
    // Send handover request
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'handover_request',
        timestamp: new Date().toISOString()
      }));
    }
    
    // Add message to UI
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `handover-request-${Date.now()}`,
        text: 'Requesting a human agent...',
        sender: 'system',
        timestamp: new Date().toISOString()
      }
    ]);
  };
  
  // Scroll to bottom of message container
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Toggle chat widget open/closed
  const toggleWidget = () => {
    setIsOpen(!isOpen);
    
    if (!isOpen && !isConnected) {
      // Will connect via useEffect
    } else if (isOpen) {
      onClose();
    }
  };
  
  // Render message based on sender
  const renderMessage = (message) => {
    const messageClass = `chat-message ${message.sender}-message`;
    const additionalClass = message.isError ? 'error-message' : 
                           message.isTranscription ? 'transcription-message' : '';
    
    return (
      <div key={message.id} className={`${messageClass} ${additionalClass}`}>
        <div className="message-content">
          <p>{message.text}</p>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="chat-widget-container">
      {/* Chat button */}
      <button 
        className={`chat-widget-button ${isOpen ? 'open' : ''}`}
        onClick={toggleWidget}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        )}
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div className="chat-widget">
          {/* Header */}
          <div className="chat-header">
            <h3>{title}</h3>
            <div className="chat-header-actions">
              <button 
                className="chat-action-button"
                onClick={requestHandover}
                title="Talk to a human agent"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>
              <button 
                className="chat-close-button"
                onClick={toggleWidget}
                aria-label="Close chat"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Messages container */}
          <div className="chat-messages">
            {messages.map(renderMessage)}
            {isTyping && (
              <div className="chat-message ai-message typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="chat-input-container">
            <textarea
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={!isConnected}
            />
            <div className="chat-input-actions">
              <button
                className={`chat-voice-button ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                title={isRecording ? 'Stop recording' : 'Start voice message'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
              <button
                className="chat-send-button"
                onClick={sendMessage}
                disabled={!inputText.trim() || !isConnected}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Connection status */}
          <div className={`chat-connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
