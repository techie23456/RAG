import express from 'express'
import "dotenv/config";
import readline from 'node:readline/promises';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { StateGraph, MessagesAnnotation, MemorySaver} from '@langchain/langgraph';

import { ChatGroq } from '@langchain/groq';

import {ToolNode} from "@langchain/langgraph/prebuilt"

import{TavilySearch} from "@langchain/tavily"



const app1 = express()

const checkpointer = new MemorySaver()

const tool = new TavilySearch({
    maxResults:1,
    topiv:'general',
    apiKey : process.env.TAVILY_API_KEY
})

const tools = [tool]

const toolNode = new ToolNode(tools)


const llm = new ChatGroq({
    model:"openai/gpt-oss-20b", //llama-3.1-8b-instant openai/gpt-oss-120b
    temperature:0,
    maxRetries:2,
}).bindTools(tools)

async function callModel(state) {
  // Return only the update; here we add a fake assistant reply

 const response = await llm.invoke(state.messages);

  return {
    messages: [response]};
  
}

function shouldContinue(state) {

     const lastMessage = state.messages[state.messages.length-1]
     if(lastMessage.tool_calls.length > 0)
     {
        return 'tools'
     }

     return '__end__'

}



const workflow = new StateGraph(MessagesAnnotation)
  .addNode('agent', callModel)
  .addNode('tools',toolNode)
  .addEdge('__start__', 'agent')
  .addEdge('tools', 'agent')
  .addConditionalEdges("agent",shouldContinue);



const app = workflow.compile(checkpointer);//{checkpointer}

async function main() {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   while (true) {
//     const userInput = await rl.question('You: ');

    // if (userInput === '/bye') {
    //   break;
    // }

    const parser = new StringOutputParser();


     app1.get('/search',async (req,res)=>{

        console.log(req.query.name)

    const finalState = await app.invoke({
    //   messages: [{ role: 'user', content: "userInput" }],

   // console.log(">>>>>>>>>>> ",req.query)
      messages: [{ role: 'user', content: req.query.name }],
    }, {cofigurable : {thread_id : "1"} } ); //{cofigurable : {thread_id:"1" } }

    const lastMessage = finalState.messages[finalState.messages.length-1]

    console.log('Final:', lastMessage.content);

    // app1.get('/',async (req,res)=>{
       // res.json(lastMessage.content)

const text = await parser.invoke(lastMessage);

    res.json(text);

    } )
  // console.log('Final:',finalState);
  }

 // rl.close();
//}

main();

app1.listen(8000,()=>{
    console.log("sever atarted at port 8000")
})

//@langcgain/community