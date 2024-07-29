const { ChannelType } = require('discord.js');
const processConversation = require("./processConversation")
const async = require('async');
class CommandHandler {
  constructor() {
    this.commands = {
      clear: this.clearCommand,
      analyze: this.analyzeCommand,
    };
  }

  isCommand(message) {
    return message.content.startsWith('/');
  }

  async handleCommand(message, conversationManager) {
    const [commandName, ...args] = message.content.slice(1).split(' ');
    const command = this.commands[commandName];

    if (command) {
      await command(message, args, conversationManager);
    } else {
      // Ignore unknown commands
      return;
    }
  }

  async clearCommand(message, args, conversationManager) {
    console.log("Hello")
    conversationManager.clearHistory(message.author.id);
    await message.reply('> `Your conversation history has been cleared.`');
  }

  async analyzeCommand(message, args, conversationManager) {
    const conversationQueue = async.queue(processConversation, 1);
  
    const channelId = message.channelId;
  
    try {
      const response = await fetch(`http://localhost:3000/chats/chat?channelId=${channelId}`);
      const data = await response.json();
  
      let finalQuery = "";
      data.forEach(item => {
        finalQuery += item.author + " says : " + item.message + 'at time : ' + item.created_at + ".";
      });
  
      let messageContent = "Messages from discord channel: " + finalQuery + ".Aggregate the workout stats of every user while classifying these activities into categories. I want only stats. Also,ignore random conversation.Don't give dates.";
     //let messageContent = "Make a short horror story in 2500 words."
      // Push a task into the queue
      
      conversationQueue.push({ message, messageContent,analyze:true });
      console.log("52")
    } catch (error) {
      console.error('Error fetching or processing data:', error);
      await message.reply('> `Failed to analyze messages. Please try again later.`');
    }
  }
  

  // async saveCommand(interaction, args, conversationManager) {
  //   const userId = interaction.user.id;
  //   const conversation = conversationManager.getHistory(userId);

  //   if (conversation.length === 0) {
  //     await interaction.reply('> `There is no conversation to save.`');
  //     return;
  //   }

  //   if (interaction.channel.type === ChannelType.DM) {
  //     await interaction.reply('> `You are already in a DM with me. The conversation is saved here.`');
  //     return;
  //   }
  
  //   const conversationText = conversation
  //     .map(line => `${line.role === 'user' ? 'User' : 'Bot'}: ${line.parts[0].text}`)
  //     .join('\n');
  
  //   try {
  //     const maxLength = 1900;
  //     const lines = conversationText.split('\n');
  //     const chunks = [];
  //     let currentChunk = '';
  
  //     for (const line of lines) {
  //       if (currentChunk.length + line.length + 1 <= maxLength) {
  //         currentChunk += (currentChunk ? '\n' : '') + line;
  //       } else {
  //         chunks.push(currentChunk);
  //         currentChunk = line;
  //       }
  //     }
  
  //     if (currentChunk) {
  //       chunks.push(currentChunk);
  //     }
  
  //     // Send each chunk as a separate message
  //     for (const [index, chunk] of chunks.entries()) {
  //       await interaction.user.send(`Here is your saved conversation (part ${index + 1}):` +
  //         `\n\n${chunk}`);
  //     }
  
  //     await interaction.reply('> `The conversation has been saved and sent to your inbox.`');
  //   } catch (error) {
  //     console.error('Error sending conversation to user:', error);
  //     await interaction.reply('> `Failed to send the conversation to your inbox. Please check your privacy settings.`');
  //   }
  // }
}

module.exports.CommandHandler = CommandHandler;