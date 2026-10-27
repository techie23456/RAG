import readline from 'node:readline/promises';
import { StateGraph, MessagesAnnotation} from '@langchain/langgraph';

import { ChatGroq } from '@langchain/groq';

import {ToolNode} from "@langchain/langgraph/prebuilt"

import{TavilySearch} from "@langchain/tavily"

const tool = new TavilySearch({
    maxResults:1,
    topiv:'general'
})

const tools = [tool]

const toolNode = new ToolNode(tools)


const llm = new ChatGroq({
    model:"openai/gpt-oss-120b",
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
  .addEdge('agent', '__end__')
  .addConditionalEdges("agent",shouldContinue);

const app = workflow.compile();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const userInput = await rl.question('You: ');

    if (userInput === '/bye') {
      break;
    }

    const finalState = await app.invoke({
      messages: [{ role: 'user', content: userInput }],
    });

    const lastMessage = finalState.messages[finalState.messages.length-1]

    console.log('Final:', lastMessage.content);
  }

  rl.close();
}

main();

//@langcgain/community