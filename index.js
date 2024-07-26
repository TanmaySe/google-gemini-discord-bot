require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, ChannelType, Events, ActivityType,GuildMessageManager } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('./config');
const { ConversationManager } = require('./conversationManager');
const { CommandHandler } = require('./commandHandler');
const processConversation = require("./processConversation")
const async = require('async');

const app = express();
const port = process.env.PORT || 3000;
const botToken = process.env.DISCORD_BOT_TOKEN
const mysql = require('mysql');
const chatsRoute = require("./routes/chatsRoute")
app.use('/chats',chatsRoute)
// Create a MySQL connection pool

app.get('/', (req, res) => {
  res.send('Gemini Discord Bot is running!');
});

app.listen(port, () => {
  console.log(`Gemini Discord Bot is listening on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});
const channel = client.channels.cache.get("1265532368882499675");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const conversationManager = new ConversationManager();
const commandHandler = new CommandHandler();
const conversationQueue = async.queue(processConversation, 1);

const activities = [
  { name: 'Assisting users', type: ActivityType.Playing },
  { name: 'Powered by Google Generative AI', type: ActivityType.Listening },
  { name: 'Available for chat', type: ActivityType.Watching }
];
let activityIndex = 0;

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Set the initial status
  client.user.setPresence({
    activities: [activities[activityIndex]],
    status: 'online',
  });
  // Change the activity every 30000ms (30 seconds)
  setInterval(() => {
    activityIndex = (activityIndex + 1) % activities.length;
    client.user.setPresence({
      activities: [activities[activityIndex]],
      status: 'online',
    });
  }, 30000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === 'clear') {
    try {
      console.log(interaction.user.id)
      conversationManager.clearHistory(interaction.user.id);
      await interaction.reply('Your conversation history has been cleared.');
    } catch (error) {
      console.error('Error handling /clear command:', error);
      try {
        await interaction.reply('Sorry, something went wrong while clearing your conversation history.');
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

  if (interaction.commandName === 'analyze') {
    try {
      // const Authorization = "Bot" + " " + botToken
      // const messageReq = await fetch(`https://discord.com/api/v10/channels/1265532368882499675/messages`, {
      //   headers: {
      //       'Authorization': Authorization
      //   }
      // });
      // const data = await messageReq.json()
      // let filteredArray = [];
      // console.log(data)
      // for (let obj of data) {
      //   if(obj.author.username != "FitnessCoach"){
      //     let filteredObj = {
      //       user_id: obj.author.id,
      //       author: obj.author.username,
      //       message: obj.content,
      //       timestamp: obj.timestamp
      //     };
      //     filteredArray.push(filteredObj);

      //   }
        
      // }
      // filteredArray.reverse()
      // const storeInDatabase = await fetch("http://localhost:3000/chats", {
      //   method: 'POST',
      //   headers: {
      //       'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(filteredArray),
      // });S
      console.log("interaction : ",interaction.reply)
      await commandHandler.analyzeCommand(interaction, [], conversationManager);

    } catch (error) {
      console.error('Error handling /analyze command:', error);
      try {
        await interaction.reply('Sorry, something went wrong while saving your conversation.');
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }  
});

client.on(Events.MessageCreate, async (message) => {
  //First gather past conversation history wrt channel and userId.Then store the chat in database.
  try {
    if (message.author.bot) return;

    //console.log("This is channel : ",message.channelId)

    const response = await fetch(`http://localhost:3000/chats/chat?userId=${message.author.id}&channelId=${message.channelId}`);

    const data = await response.json();

    console.log(data)

    let finalQuery = ""

    data.forEach(item => {
      finalQuery += item.message + '.'
    });

    console.log(" message : ",message);

    const storeInDatabase = await fetch("http://localhost:3000/chats", {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        user_id:message.author.id,
        author:message.author.username,
        message:message.content,
        message_id:message.id,
        channelId:message.channelId,
      }]),
    });



    const isDM = message.channel.type === ChannelType.DM;
    
    if (isDM || message.mentions.users.has(client.user.id)) {
      let messageContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim();
      
      if (messageContent === '') {
        await message.reply("> `It looks like you didn't say anything. What would you like to talk about?`");
        return;
      }
      
      messageContent = "MyFitnessHistory: {" + finalQuery + "} currentFitnessQuery:{" + messageContent + "} "+ "If the currentFitnessQuery DOES NOT requires context then don't consider MyFitnessHistory .If the query is health/fitness related then only respond.Else say that i can answer only health related queries. Additonally Answer in about 1000 characters always"
    
      conversationQueue.push({ message, messageContent,analyze:false });
    }
  } catch (error) {
    console.error('Error processing the message:', error);
    await message.reply('Sorry, something went wrong!');
  }
});


client.login(process.env.DISCORD_BOT_TOKEN);