require('dotenv').config();
const { ConversationManager } = require('./conversationManager');
const { Client, GatewayIntentBits, ChannelType, Events, ActivityType, GuildMessageManager } = require('discord.js');
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

// Function to trim text to a maximum of 1700 words
function trimTo1700Words(text) {
    const words = text.split(/\s+/); // Split by whitespace
    if (words.length > 1700) {
        return words.slice(0, 1700).join(' '); // Trim and join back to a string
    }
    return text;
}

// Function to split text into chunks of a specific maximum length
function splitIntoChunks(text, maxLength) {
    const chunks = [];
    while (text.length > maxLength) {
        let chunk = text.slice(0, maxLength);
        let lastSpaceIndex = chunk.lastIndexOf(' ');
        if (lastSpaceIndex > -1) {
            chunk = text.slice(0, lastSpaceIndex);
            text = text.slice(lastSpaceIndex + 1);
        } else {
            text = text.slice(maxLength);
        }
        chunks.push(chunk);
    }
    if (text.length > 0) {
        chunks.push(text);
    }
    return chunks;
}

async function processConversation({ message, messageContent, analyze }) {
    try {
        console.log("line 51 : ", message.reply);
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
        if (analyze) {
            await message.deferReply({ ephemeral: true });
            const model = await genAI.getGenerativeModel({ model: config.modelName });
            const chat = model.startChat({
                safetySettings: config.safetySettings,
            });
            const result = await chat.sendMessage(messageContent);
            let finalResponse = result.response.text();
            
            // Trim the response to a maximum of 1700 words
            finalResponse = trimTo1700Words(finalResponse);

            // Split the response into chunks of 2000 characters or less
            const chunks = splitIntoChunks(finalResponse, 1000);

            finalResponse = ""

            // Edit the reply with each chunk
            for (const chunk of chunks) {
              finalResponse += chunk
                await message.editReply({ content: finalResponse });
                // Optionally add a delay to avoid hitting rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await stopTyping();
        } else {
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

module.exports = processConversation;
