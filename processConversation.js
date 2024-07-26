require('dotenv').config();
const { ConversationManager } = require('./conversationManager');

const { Client, GatewayIntentBits, ChannelType, Events, ActivityType,GuildMessageManager } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('./config');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const conversationManager = new ConversationManager();

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });
  const channel = client.channels.cache.get("1265532368882499675");
async function processConversation({ message, messageContent,analyze }) {
    try {
        console.log("line 51 : ",message.reply)
      const typingInterval = 2000;
      let typingIntervalId;
      
      // Start the typing indicator
      const startTyping = async () => {
        typingIntervalId = setInterval(() => {
          message.channel.sendTyping();
        }, typingInterval);
      };
  
      // Stop the typing indicator
      const stopTyping = () => {
        clearInterval(typingIntervalId);
      };
  
      await startTyping();
      if(analyze){
        const model = await genAI.getGenerativeModel({ model: config.modelName });
        const chat = model.startChat({
            safetySettings: config.safetySettings,
        });
        const botMessage = await message.reply('> `Generating a response...`');
        await conversationManager.handleModelResponse(botMessage, () => chat.sendMessageStream(messageContent), message);
        
        await stopTyping();
      }
      else{
        const model = await genAI.getGenerativeModel({ model: config.modelName });
        const chat = model.startChat({
            history: conversationManager.getHistory(message.author.id),
            safetySettings: config.safetySettings,
        });
        const botMessage = await message.reply('> `Generating a response...`');
        await conversationManager.handleModelResponse(botMessage, () => chat.sendMessageStream(messageContent), message);
        
        await stopTyping();
      }
      
      
    } catch (error) {
      console.error('Error processing the conversation:', error);
      await message.reply('Sorry, something went wrong!');
    }
}

module.exports = processConversation