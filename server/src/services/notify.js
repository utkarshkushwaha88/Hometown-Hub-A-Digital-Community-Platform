import { Notification } from '../models/index.js';
export async function notify(recipient,type,title,message,relatedResource=null,resourceType=null){if(!recipient)return;return Notification.create({recipient,type,title,message,relatedResource,resourceType});}
