---
title: "Exposing Resources in MCP Server with Spring AI"
description: "A Guide to exposing resources in an MCP server using Java and Spring AI"
pubDate: 2025-07-21
tags: ["Java", "Spring AI", "MCP"]
draft: false
---

Read the original here (published by me): <a href="https://medium.com/@techtopics/exposing-resources-in-mcp-server-with-spring-ai-efbdfab1eaeb">Exposing Resources in MCP Server with Spring AI</a>

I decided to write this article due to issues I faced while trying to create an MCP server and due to the lack of resources, documentation, and examples to solve the issues. There are already more than enough resources for implementing tools in an MCP server with Spring AI, however very few are available for **resources**.

In this article, we will see how to add resources with Spring AI, mainly files of different formats from the filesystem. We’ll see how to add both text-based and non-text-based files to an MCP server.

---
## Types of Resources in MCP

Resources can be of two types in MCP:

- **Text resources** (contain UTF-8 encoded text data)  
  *Example:* txt, xml, csv, json, html.

- **Binary resources** (contain raw binary data encoded in base64)  
  *Example:* Images, pdfs, audios, videos.

---

## What We’ll Be Doing

Before we get started, here is what we’ll be doing:

- Create an MCP server in Spring AI which supports **SSE transport**
- Expose some resources from the filesystem in the MCP server
- Connect to the server using **MCP Inspector**
- Use MCP Inspector to view our resources

---

## Getting Started

Like any other Spring project, we need to head to **Spring Initializr** to create our project. Choose **Java with Maven** to follow along, and the only dependency that you need to add is **Model Context Protocol Server**.

Click **Generate** and extract it into a project folder.

---

## pom.xml Changes

We need to make some minor changes to `pom.xml` and `application.properties` in order to have SSE support and start working.

Change the following in `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server</artifactId>
</dependency>
````

To:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

And add the following in `application.properties`:

```properties
server.servlet.contextPath=/mcp-with-resources
server.port=9092
spring.ai.mcp.server.name=mcp-with-resources
spring.ai.mcp.server.version=0.0.1
spring.ai.mcp.server.base-url=/mcp-with-resources
logging.level.io.modelcontextprotocol=DEBUG
logging.level.root=INFO
```

You can change the port, contextPath, and base-url as you like.

---

## Adding MCP Resource

```java
public static void main(String[] args) {
  SpringApplication.run(McpExampleApplication.class, args);
}

@Bean
public List<McpServerFeatures.SyncResourceSpecification> myResources() {

}
```

We only need the above method in order to expose resources to an MCP server.

We need to return a `List<SyncResourceSpecification>` which will then be exposed as a resource.

As already mentioned, we will be exposing all files in a folder as a resource. In order to do that, we will be iterating over all the files in a path.

```java
@Bean
public List<McpServerFeatures.SyncResourceSpecification> myResources() {
  String path = "C:\\<some-folder>\\resources";
  Path folderPath = Paths.get(path);
  List<McpServerFeatures.SyncResourceSpecification> resourceSpecifications = new ArrayList<>();

  try (Stream<Path> paths = Files.walk(folderPath)) {
    paths.filter(Files::isRegularFile)
         .forEach(filePath -> {

         });
  } catch (IOException e) {

  }
  return resourceSpecifications;
}
```

Replace the `path` variable with your desired folder path containing resources.

Right now, we have an empty list of `SyncResourceSpecification`, but soon we will create the required objects to populate it.

---

## Creating MCP Resource Metadata

We need to create an `McpSchema.Resource` with the following details:

* **uri:** Unique identifier for the resource
* **name:** The name of the resource
* **description:** Optional description
* **mimeType:** Optional MIME type
* **annotations:** Can be left empty for now (`null`)

```java
try (Stream<Path> paths = Files.walk(folderPath)) {
  paths.filter(Files::isRegularFile)
      .forEach(filePath -> {
        File currentFile = new File(String.valueOf(filePath));
        var systemInfoResource = new McpSchema.Resource(
            "file://" + currentFile.getAbsolutePath(),
            currentFile.getName(),
            currentFile.getName(),
            getMimeType(Paths.get(currentFile.getPath())),
            null
        );
      });
} catch (IOException e) {

}
```

I have given the file name as the description, but you can provide any string as you like.

---

## Defining ResourceSpecification

Now, we can work on defining the `ResourceSpecification` for each file.

```java
@Bean
public List<McpServerFeatures.SyncResourceSpecification> myResources() {
  String path = "C:\\<some-folder>\\resources";
  Path folderPath = Paths.get(path);
  List<McpServerFeatures.SyncResourceSpecification> resourceSpecifications = new ArrayList<>();

  try (Stream<Path> paths = Files.walk(folderPath)) {
    paths.filter(Files::isRegularFile)
        .forEach(filePath -> {
          File currentFile = new File(String.valueOf(filePath));
          var systemInfoResource = new McpSchema.Resource(
              "file://" + currentFile.getAbsolutePath(),
              currentFile.getName(),
              currentFile.getName(),
              getMimeType(Paths.get(currentFile.getPath())),
              null
          );

          // Resource specifications
          var resourceSpecification =
              new McpServerFeatures.SyncResourceSpecification(
                  systemInfoResource,
                  (exchange, request) -> {
                    try {
                      String localPath = request.uri().replace("file://", "");
                      Path currentFilePath = Paths.get(localPath);
                      String mimeType = getMimeType(currentFilePath);
                      if (mimeType == null) {
                        mimeType = "application/octet-stream";
                      }

                      if (mimeType.startsWith("text/")
                          || mimeType.equals("application/json")
                          || mimeType.equals("application/xml")) {

                        String textContent =
                            Files.readString(currentFilePath).trim();
                        return new McpSchema.ReadResourceResult(
                            List.of(
                                new McpSchema.TextResourceContents(
                                    request.uri(),
                                    mimeType,
                                    textContent)));

                      } else {
                        byte[] fileBytes =
                            Files.readAllBytes(currentFilePath);
                        String base64Content =
                            Base64.getEncoder().encodeToString(fileBytes);

                        if (!base64Content.isEmpty()) {
                          return new McpSchema.ReadResourceResult(
                              List.of(
                                  new McpSchema.BlobResourceContents(
                                      request.uri(),
                                      mimeType,
                                      base64Content)));
                        } else {
                          return new McpSchema.ReadResourceResult(
                              List.of(
                                  new McpSchema.TextResourceContents(
                                      request.uri(),
                                      mimeType,
                                      "No content available")));
                        }
                      }

                    } catch (Exception e) {
                      throw new RuntimeException("Failed to read resource", e);
                    }
                  });

          resourceSpecifications.add(resourceSpecification);
        });
  } catch (IOException e) {

  }
  return resourceSpecifications;
}
```

---

## Explanation

We have to create a `McpServerFeatures.SyncResourceSpecification` object. This is where we define what we return when we receive a **read** request from the client.

First, we find out the MIME type of the file:

```java
String mimeType = getMimeType(currentFilePath);
```

To get the MIME type, we are using Java’s inbuilt `Files.probeContentType`:

```java
private static String getMimeType(Path filePath) {
  try {
    return Files.probeContentType(filePath);
  } catch (IOException e) {
    return "application/json";
  }
}
```

Based on the MIME type, we decide whether to return the content as a text string or as a base64-encoded binary string.

---

## Handling Text Resources

For text content, we read the file using:

```java
String textContent = Files.readString(currentFilePath).trim();
```

And return it as:

```java
if (mimeType.startsWith("text/")
    || mimeType.equals("application/json")
    || mimeType.equals("application/xml")) {

  String textContent = Files.readString(currentFilePath).trim();
  return new McpSchema.ReadResourceResult(
      List.of(
          new McpSchema.TextResourceContents(
              request.uri(),
              mimeType,
              textContent)));
}
```

---

## Handling Binary Resources

For non-text content, we read the file bytes:

```java
byte[] fileBytes = Files.readAllBytes(currentFilePath);
```

Then encode it as base64:

```java
String base64Content = Base64.getEncoder().encodeToString(fileBytes);
```

And return it as:

```java
if (!base64Content.isEmpty()) {
  return new McpSchema.ReadResourceResult(
      List.of(
          new McpSchema.BlobResourceContents(
              request.uri(),
              mimeType,
              base64Content)));
}
```

---

## Fallback for Empty Content

The below is just a fallback when there is no content available in the files:

```java
else {
  return new McpSchema.ReadResourceResult(
      List.of(
          new McpSchema.TextResourceContents(
              request.uri(),
              mimeType,
              "No content available")));
}
```

---

## Running the MCP Server

With all the above content, your MCP server should now be ready. Start the Spring application, and you should see the following in the console:

```text
Tomcat started on port 9092 (http) with context path '/mcp-with-resources'
```

---

## Connect to the Server Using MCP Inspector

To run MCP Inspector, execute the command:

```bash
npx @modelcontextprotocol/inspector
```

---

## MCP Inspector

To connect to the MCP server, make sure your Spring application is running. Change the **Transport Type** to **SSE** and provide the URL as mentioned in `application.properties`.

After clicking **Connect**, Notice that the server is connected.

---

## Using MCP Inspector

Now you can perform various operations from the client such as:

* **List Resources**
* **Viewing the content of a Resource**

Our MCP server does not have any prompts or tools, so you won’t be able to see anything in the other tabs.

You can click **List Resources** to see the files in the folder you provided.

You might have to increase the **Request Timeout** and **Maximum Total Timeout** in order to see the result, as the request can take more time.

You can see the files in the folder I have provided:

* example-text-file.txt
* example-docx-file.docx
* example-image.png

**NOTE:** It is recommended to use `AsyncResourceSpecification` if the requests can take a long time. However, we have implemented our server with `SyncResourceSpecification`, so we have to increase the timeout.

---

## Viewing File Contents

You can click on any of the files to see their content

Remember that files like `docx` and `png` will have base64-encoded strings, hence you will not be able to understand them unless you decode them.

---

## Summary

In this article, we have:

* Created an MCP server with Spring AI
* Exposed the files in a folder from the filesystem as a resource
* Connected to the MCP server with MCP Inspector
* Viewed the files and their content in MCP Inspector

