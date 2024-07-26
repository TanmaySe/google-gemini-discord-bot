class ConversationManager {
    constructor() {
      this.chatHistories = {};
      this.userSettings = {};
    }
  
    getHistory(userId) {
      return this.chatHistories[userId]?.map((line, index) => ({
        role: index % 2 === 0 ? 'user' : 'model',
        parts: [{ text: line }],
      })) || [];
    }
  
    updateChatHistory(userId, userMessage, modelResponse) {
      if (!this.chatHistories[userId]) {
        this.chatHistories[userId] = [];
      }
      this.chatHistories[userId].push(userMessage);
      this.chatHistories[userId].push(modelResponse);
    }
  
    clearHistory(userId) {
      delete this.chatHistories[userId];
    }
  
    isNewConversation(userId) {
      return !this.chatHistories[userId] || this.chatHistories[userId].length === 0;
    }
  
    async handleModelResponse(botMessage, responseFunc, originalMessage) {
      try {
       
        console.log("botMessage.channel", botMessage.channel);
        const messageResult = await responseFunc();
        console.log("line 36");
        let finalResponse = '';
        for await (const chunk of messageResult.stream) {
          finalResponse += await chunk.text();
        }
        console.log("line 41");
    
        // Split the response into chunks of 2000 characters or less
        const chunks = this.splitResponse(finalResponse);
        console.log("line 45");
    
        // Send each chunk as a separate message, but only if the interaction is still valid
        for (const chunk of chunks) {
          // Check if botMessage is still valid for sending
          if (!botMessage.deleted) {
            await botMessage.channel.send(chunk);
          }
        }
        console.log("line 51");
    
        // Optionally update chat history if needed
        // this.updateChatHistory(userId, originalMessage.content, finalResponse);
      } catch (error) {
        console.error(error.message);
        if (!originalMessage.replied) {
          await originalMessage.reply("Bhai code theek kar apna");
        }
      }
    }
    
  
    splitResponse(response) {
      const chunks = [];
      const maxLength = 2000;
  
      while (response.length > maxLength) {
        const chunk = response.slice(0, maxLength);
        const lastSpaceIndex = chunk.lastIndexOf(' ');
        const sliceIndex = lastSpaceIndex !== -1 ? lastSpaceIndex : maxLength;
        chunks.push(response.slice(0, sliceIndex));
        response = response.slice(sliceIndex).trim();
      }
  
      if (response.length > 0) {
        chunks.push(response);
      }
  
      return chunks;
    }
  }
  
  module.exports.ConversationManager = ConversationManager;