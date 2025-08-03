import express from 'express';
import {ChatService} from "./handler.js";
import {asyncWrapper} from "../utils/index.js";
import {createChatValidation, deleteChatValidation, validate} from "./utils/validator.js";
const chatRouter=express.Router();

chatRouter.post('/conversations',[...createChatValidation,validate],asyncWrapper(ChatService.createChat)); //return existing or create conversation
chatRouter.get('/conversations',asyncWrapper(ChatService.getMyChatList)); // list all conversation people chatted
chatRouter.get('/conversations/:conversationsId',[...deleteChatValidation,validate],asyncWrapper(ChatService.getChatMessages)); // when user click on conversation chat history
chatRouter.delete('/conversations/:conversationsId',[...deleteChatValidation,validate],asyncWrapper(ChatService.deleteChat)); // when user click on conversation chat history
chatRouter.post('/translate-message',asyncWrapper(ChatService.translateMessageREST)); // translate specific message


export default chatRouter;