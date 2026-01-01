---
title: "Agentic AI in Java: LangGraph4j, Spring AI, and MCP Tools"
description: "Implementing an Agentic workflow in java using Spring AI and Langgraph4j"
pubDate: 2025-09-01
tags: ["Java", "Langgraph4j", "MCP", "Spring AI", "Agents"]
draft: false
---

Read the original here (published by me): <a href="https://medium.com/@techtopics/agentic-ai-in-java-langgraph4j-spring-ai-and-mcp-tools-7c8b300d521f">Agentic AI in Java: LangGraph4j, Spring AI, and MCP Tools</a>

Agentic AI is often seen as a python first domain, I am not here to tell you that it is not. Python does have incredible frameworks and a great community when it comes to building AI Agents and AI applications. I am rather here to point out that Java, with its long history in enterprise software and strong developer community, is far from irrelevant in AI ecosystem.

In this article, I would like to show how AI Agents with MCP tools can be built in Java using Spring AI and LangGraph4j, while also keeping human in the loop.

For those that are not aware about Agents and MCP yet, I wrote a article previously that introduces people to what Agents and MCP are, you can read it here: *What are AI Agents?*

Here’s what will be shown in this article:

- **Building Agents with Spring AI**
- **Providing tools to the Agents directly and through MCP**
- **Creating a complex workflow in Langgraph4j with State**
- **Conclusion**

Let’s get started!

---

## Building Agents with Spring AI

Spring AI provides very easy way to make Agents and provide tools to it, the code would look as simple as this,

```java
String response = chatClient.prompt(systemPrompt)
        .toolCallbacks(tools)
        .user(prompt)
        .call()
        .content();
````

where,

* `.toolCallbacks` defines what actions an agent can perform,
* `.prompt` defines the behavior of the agent through system prompt
* `.user` defines the current input for the agent (this does not necessarily have to come from an actual user, it can also be from another agent)

In this article, we will be building the agentic workflow in the following structure:
```md
┌─────────────────────┐
│       START         │
└──────────┬──────────┘
           │
           │ Find opportunities for Y,
           │ he has 2 years of
           │ experience in New York
           ▼
┌─────────────────────┐          ┌────────────────────────────────┐
│  Opportunity Agent  │---Tools->│ 1. getSkillsOfPerson()         │
└──────────┬──────────┘          │ 2. findOpportunitiesForSkills()│
           │                     └────────────────────────────────┘
           │ Suggests an
           │ opportunity
           ▼
┌─────────────────────┐          ┌─────────────────────────────────────┐
│   Upskill Agent     │---Tools->│ 1. getSkillsOfPerson()              │
└──────────┬──────────┘          │ 2. getSkillsRequiredForOpportunity()│
           │                     └─────────────────────────────────────┘
           │ Plan for upskilling
           │ based on opportunity
           ▼
┌─────────────────────┐          ┌─────────────────────────────────────┐
│Connection Finder    │---Tools->│ 1. getSkillsOfPerson()              │
│      Agent          │          │ 2. getSkillsRequiredForOpportunity()│
└──────────┬──────────┘          └─────────────────────────────────────┘
           │
           │ Suggests a connection
           │ to pursue opportunity
           ▼
┌─────────────────────┐
│  Human Approval     │
└──────────┬──────────┘
           │ suggestion approved
           │
     ┌─────┘
     │ Suggestion rejected
     │ (loops back to Connection Finder Agent)
     │
     └─────────────────┐
                       ▼
           ┌───────────────────────┐              ┌──────────────────┐         ┌──────────────────────────┐
           │  Connection Agent     │----MCP------>│   MCP Server     │--Tools->│ getContactBackground()   │
           └───────────┬───────────┘              └──────────────────┘         │ getContactInterests()    │
                       │                                                       │ sendConnectionRequest()  │
                       │                                                       └──────────────────────────┘
                       │ Sends a connection
                       │ request with a warm
                       │ message to the
                       │ connection suggestion
                       ▼
           ┌─────────────────────┐
           │        END          │
           └─────────────────────┘
```

We will have the following Agents:

* **Opportunity Agent** :-

    * Suggests a job opportunity based on the person’s skills
* **Upskill Agent** :-

    * Gives a plan to the person in order to upskill to have a higher chance at getting the job
* **Connection Finder Agent** :-

    * Helps in finding relevant connections and gives one suggestion. If approved, the connection suggestion is given to connection agent. If rejected, it will provide another suggestion.
* **Connection Agent** :-

    * Sends a connection request with a warm connection message

Now let’s start getting into the actual code. Like any other spring project, we need to head to Spring Initializr to create our project, Choose Java with Maven to follow along. Click generate and extract it into a project folder.

You will need the following dependencies in your spring ai project:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>1.1.0-SNAPSHOT</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>org.bsc.langgraph4j</groupId>
            <artifactId>langgraph4j-bom</artifactId>
            <version>1.5.14</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-client</artifactId>
    </dependency>
    <dependency>
        <groupId>org.bsc.langgraph4j</groupId>
        <artifactId>langgraph4j-core</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-azure-openai</artifactId>
    </dependency>
    <dependency>
        <groupId>com.azure</groupId>
        <artifactId>azure-core-http-okhttp</artifactId>
        <version>1.12.11</version>
    </dependency>
</dependencies>
```

I am using azure-openai but you can change that as preferred.

---

## AgentNode Definition

```java
package org.springframework.ai.mcp.client.langgraph.multiagent.agentnodes;

import org.bsc.langgraph4j.action.NodeAction;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.mcp.client.langgraph.multiagent.memory.State;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;
import java.util.Map;

public class AgentNode implements NodeAction<State> {

  String agentName;
  String systemPrompt;
  ToolCallback[] tools;
  ChatClient chatClient;

  public AgentNode(String agentName, String systemPrompt, ToolCallback[] tools, ChatClient chatClient) {
    this.agentName = agentName;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.chatClient = chatClient;
  }

  @Override
  public Map<String, Object> apply(State state) {

    String input = state.getCurrentMessage();

    //Appending previous messages to the context
    StringBuilder inputWithContext = new StringBuilder();
    if (state.getPreviousMessages().size() > 1) {
      inputWithContext.append("PREVIOUS CONVERSATION:\n");
      for (Map<String, String> message : state.getPreviousMessages()) {
        inputWithContext.append(message.get("role")).append(": ").append(message.get("content")).append("\n");
      }
      inputWithContext.append("END OF PREVIOUS CONVERSATION\n\n");
    }
    
    //Appending the current input
    inputWithContext
            .append(state.getPreviousAgentKey())
            .append(": ")
            .append(input)
            .append("\n");
    
    //Invoking the Agent
    String response = chatClient.prompt(systemPrompt)
            .toolCallbacks(tools)
            .user(inputWithContext.toString())
            .call()
            .content();

    System.out.println(response);
    
    //Adding the current message and response to the state
    Map<String, String> newMessage = Map.of(
            "role", agentName,
            "content", response
    );

    List<Map<String, String>> previousMessages = state.getPreviousMessages();
    previousMessages.add(newMessage);

    return Map.of(
            State.CURRENT_MESSAGE_KEY, response,
            State.PREVIOUS_AGENT_KEY, agentName,
            State.PREVIOUS_MESSAGES_KEY, previousMessages
    );

  }

  public String getAgentName() {
    return agentName;
  }
}
```

I have added comments in the code to explain what each part of the AgentNode does, but we will come back to this after we have discussed about state in langgraph4j.

---

## Providing tools to the Agents directly and through MCP

You can see above how each agent is created, and you can see how tools are provided to those agents. We will have to reuse the name of the Agent several times when we define our workflow, hence they are defined in enum.

You might notice that tools are provided slightly differently for connection agent, that is because the tools are received from MCP server and not defined directly in our project.

To connect to an MCP server, all you have to do is, add the following properties in `application.properties` or `application.yaml`.

```properties
spring.ai.mcp.client.sse.connections.connectionagent-remote.url=http://localhost:9091
spring.ai.mcp.client.sse.connections.connectionagent-remote.sse-endpoint=/connection-mcp/sse
```

The URL and sse-endpoint would differ based on your mcp server. You can also define mcp servers that use other transports (stdio or streamable http). Spring AI will instantitate a `List<McpClient>` based on how many mcp servers we have defined in our properties.

---

## Creating a complex workflow in Langgraph4j with State

First, we will define our state schema for the workflow, then we will build the actual graph.

In Langgraph4j, **State** serves as the shared data structure that represents the current snapshot of your application’s workflow or conversation. It is accessible by all parts of the workflow (edges and nodes).

The below will be the state for our workflow,

```java
package org.springframework.ai.mcp.client.langgraph.multiagent.memory;

import org.bsc.langgraph4j.state.AgentState;
import org.bsc.langgraph4j.state.Channel;
import org.bsc.langgraph4j.state.Channels;

import java.util.*;

public class State extends AgentState {
  public static final String PREVIOUS_AGENT_KEY = "current_agent";
  public static final String CURRENT_MESSAGE_KEY = "current_message";
  public static final String PREVIOUS_MESSAGES_KEY = "previous_messages";

  public static final Map<String, Channel<?>> SCHEMA = Map.of(
          PREVIOUS_AGENT_KEY, Channels.base(() -> ""),
          CURRENT_MESSAGE_KEY, Channels.base(() -> ""),
          PREVIOUS_MESSAGES_KEY, Channels.base(() -> new ArrayList<Map<String, String>>())
  );

  public State(Map<String, Object> initData) {
    super(initData);
  }

  public List<Map<String, String>> getPreviousMessages() {
    return this.<List<Map<String, String>>>value(PREVIOUS_MESSAGES_KEY).orElse(new ArrayList<>());
  }

  public String getPreviousAgentKey() {
    return this.<String>value(PREVIOUS_AGENT_KEY).orElse("NO AGENT");
  }

  public String getCurrentMessage() {
    return this.<String>value(CURRENT_MESSAGE_KEY).orElse("");
  }
}
```

It has three main parts:

* **Previous Agent Key**
* **Previous Messages**
* **Current Message**

---

## Conclusion

To conclude, In this article, we explored how to bring Agentic AI into the Java ecosystem by combining:

* **Spring AI** → for building agents and integrating tools (both local and MCP).
* **LangGraph4j** → for defining structured, stateful multi-agent workflows with human-in-the-loop.
* **MCP (Model Context Protocol)** → for standardizing tool/resource sharing between systems.

This demo also shows that anything that can be done using other frameworks and languages can also be done in Java. While Java may not be considered an AI first language, it remains the backbone of many enterprises. AI workflows and agentic patterns are absolutely possible in Java, making it just as capable in enterprise AI contexts.

---

