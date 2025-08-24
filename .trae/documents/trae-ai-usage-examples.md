# Trae AI Usage Examples and Tutorials

## 1. Getting Started

### 1.1 Quick Start Guide

#### Step 1: Authentication
First, obtain your API key from the Trae AI dashboard and authenticate:

```python
from trae_ai import TraeAI

# Initialize the client
client = TraeAI(api_key="your_api_key_here")

# Test authentication
try:
    user_info = client.auth.get_user_info()
    print(f"Welcome, {user_info.name}!")
except Exception as e:
    print(f"Authentication failed: {e}")
```

#### Step 2: Create Your First Conversation
```python
# Create a new conversation
conversation = client.conversations.create(
    title="My First AI Conversation",
    model="gpt-4",
    system_prompt="You are a helpful assistant that provides clear and concise answers."
)

print(f"Conversation created with ID: {conversation.id}")
```

#### Step 3: Send a Message
```python
# Send a message and get response
response = client.conversations.send_message(
    conversation_id=conversation.id,
    message="What are the key benefits of using AI in software development?"
)

print(f"AI Response: {response.content}")
print(f"Tokens used: {response.tokens_used}")
```

### 1.2 Basic Configuration

```python
# Configure client with custom settings
client = TraeAI(
    api_key="your_api_key",
    base_url="https://api.trae.ai/v1",
    timeout=30,
    max_retries=3,
    debug=True
)

# Set default conversation parameters
default_settings = {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9
}

client.set_default_settings(default_settings)
```

## 2. Common Use Cases

### 2.1 Document Analysis and Summarization

```python
def analyze_document(file_path, analysis_type="summary"):
    """
    Analyze a document and provide insights
    """
    # Upload the document
    with open(file_path, 'rb') as file:
        uploaded_file = client.files.upload(
            file=file,
            purpose="analysis",
            metadata={"analysis_type": analysis_type}
        )
    
    # Create conversation for document analysis
    conversation = client.conversations.create(
        title=f"Document Analysis: {uploaded_file.filename}",
        model="gpt-4",
        system_prompt="You are an expert document analyst. Provide thorough and structured analysis."
    )
    
    # Request analysis
    if analysis_type == "summary":
        prompt = f"Please provide a comprehensive summary of the uploaded document (file_id: {uploaded_file.file_id}). Include key points, main themes, and important conclusions."
    elif analysis_type == "insights":
        prompt = f"Analyze the uploaded document (file_id: {uploaded_file.file_id}) and provide key insights, trends, and actionable recommendations."
    elif analysis_type == "questions":
        prompt = f"Based on the uploaded document (file_id: {uploaded_file.file_id}), generate a list of thoughtful questions that could be asked about the content."
    
    response = client.conversations.send_message(
        conversation_id=conversation.id,
        message=prompt,
        tools=["file_analyzer"]
    )
    
    return {
        "conversation_id": conversation.id,
        "file_id": uploaded_file.file_id,
        "analysis": response.content,
        "tokens_used": response.tokens_used
    }

# Example usage
result = analyze_document("./reports/quarterly_report.pdf", "summary")
print(result["analysis"])
```

### 2.2 Code Review and Analysis

```python
def review_code(code_content, language="python", review_type="comprehensive"):
    """
    Perform automated code review
    """
    conversation = client.conversations.create(
        title="Code Review Session",
        model="gpt-4",
        system_prompt=f"You are an expert {language} developer and code reviewer. Provide detailed, constructive feedback focusing on best practices, security, performance, and maintainability."
    )
    
    review_prompts = {
        "comprehensive": f"Please perform a comprehensive code review of the following {language} code. Check for:\n- Code quality and best practices\n- Security vulnerabilities\n- Performance issues\n- Maintainability concerns\n- Suggestions for improvement\n\nCode:\n```{language}\n{code_content}\n```",
        "security": f"Focus specifically on security aspects of this {language} code. Identify potential vulnerabilities and suggest fixes:\n\n```{language}\n{code_content}\n```",
        "performance": f"Analyze the performance characteristics of this {language} code and suggest optimizations:\n\n```{language}\n{code_content}\n```"
    }
    
    response = client.conversations.send_message(
        conversation_id=conversation.id,
        message=review_prompts[review_type]
    )
    
    return {
        "review": response.content,
        "conversation_id": conversation.id,
        "tokens_used": response.tokens_used
    }

# Example usage
code_to_review = """
def process_user_data(user_input):
    # This function processes user input
    result = eval(user_input)  # Potential security issue
    return result

def save_to_database(data):
    query = f"INSERT INTO users VALUES ('{data['name']}', '{data['email']}')"  # SQL injection risk
    execute_query(query)
"""

review_result = review_code(code_to_review, "python", "security")
print(review_result["review"])
```

### 2.3 Research and Information Gathering

```python
def research_topic(topic, depth="comprehensive", sources=None):
    """
    Conduct research on a specific topic
    """
    conversation = client.conversations.create(
        title=f"Research: {topic}",
        model="gpt-4",
        system_prompt="You are a research assistant. Provide well-structured, factual information with proper citations when possible."
    )
    
    research_prompt = f"""
    Please conduct {depth} research on the topic: "{topic}"
    
    Please include:
    1. Overview and background
    2. Current state and recent developments
    3. Key players and stakeholders
    4. Challenges and opportunities
    5. Future outlook and trends
    6. Relevant statistics and data points
    
    {f'Focus particularly on sources from: {sources}' if sources else ''}
    """
    
    response = client.conversations.send_message(
        conversation_id=conversation.id,
        message=research_prompt,
        tools=["web_search", "academic_search"]
    )
    
    # Follow up with specific questions
    follow_up_questions = [
        "What are the most recent developments in this area?",
        "Who are the leading experts or organizations in this field?",
        "What are the main challenges facing this industry/topic?"
    ]
    
    additional_insights = []
    for question in follow_up_questions:
        follow_up = client.conversations.send_message(
            conversation_id=conversation.id,
            message=question,
            tools=["web_search"]
        )
        additional_insights.append({
            "question": question,
            "answer": follow_up.content
        })
    
    return {
        "main_research": response.content,
        "additional_insights": additional_insights,
        "conversation_id": conversation.id
    }

# Example usage
research_result = research_topic(
    "Artificial Intelligence in Healthcare 2024",
    depth="comprehensive",
    sources=["medical journals", "healthcare technology reports"]
)
print(research_result["main_research"])
```

### 2.4 Content Creation and Writing

```python
def create_content(content_type, topic, target_audience, tone="professional", length="medium"):
    """
    Generate various types of content
    """
    conversation = client.conversations.create(
        title=f"Content Creation: {content_type}",
        model="gpt-4",
        system_prompt=f"You are a professional content writer specializing in {content_type}. Write in a {tone} tone for {target_audience}."
    )
    
    length_guidelines = {
        "short": "300-500 words",
        "medium": "800-1200 words",
        "long": "1500-2500 words"
    }
    
    content_prompts = {
        "blog_post": f"Write a {length_guidelines[length]} blog post about '{topic}' for {target_audience}. Include an engaging introduction, well-structured body with subheadings, and a compelling conclusion. Make it SEO-friendly.",
        "technical_documentation": f"Create comprehensive technical documentation about '{topic}' for {target_audience}. Include clear explanations, code examples where relevant, and step-by-step instructions.",
        "marketing_copy": f"Write compelling marketing copy about '{topic}' targeting {target_audience}. Focus on benefits, create urgency, and include a clear call-to-action.",
        "email_campaign": f"Create an email campaign about '{topic}' for {target_audience}. Include subject line, preview text, and email body with clear structure.",
        "social_media": f"Create social media content about '{topic}' for {target_audience}. Include posts for different platforms (Twitter, LinkedIn, Facebook) with appropriate hashtags."
    }
    
    response = client.conversations.send_message(
        conversation_id=conversation.id,
        message=content_prompts[content_type]
    )
    
    # Request variations if needed
    variations = client.conversations.send_message(
        conversation_id=conversation.id,
        message="Please provide 3 alternative headlines/titles for this content."
    )
    
    return {
        "content": response.content,
        "alternative_titles": variations.content,
        "conversation_id": conversation.id,
        "tokens_used": response.tokens_used + variations.tokens_used
    }

# Example usage
content_result = create_content(
    content_type="blog_post",
    topic="Best Practices for Remote Team Management",
    target_audience="startup founders and team leaders",
    tone="professional yet approachable",
    length="medium"
)
print(content_result["content"])
```

## 3. Advanced Integration Patterns

### 3.1 Batch Processing

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class BatchProcessor:
    def __init__(self, client, max_workers=5):
        self.client = client
        self.max_workers = max_workers
    
    def process_documents_batch(self, file_paths, analysis_type="summary"):
        """
        Process multiple documents in parallel
        """
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = []
            for file_path in file_paths:
                future = executor.submit(self._process_single_document, file_path, analysis_type)
                futures.append(future)
            
            results = []
            for future in futures:
                try:
                    result = future.result(timeout=300)  # 5 minute timeout
                    results.append(result)
                except Exception as e:
                    results.append({"error": str(e), "file_path": file_path})
            
            return results
    
    def _process_single_document(self, file_path, analysis_type):
        """
        Process a single document
        """
        try:
            # Upload file
            with open(file_path, 'rb') as file:
                uploaded_file = self.client.files.upload(
                    file=file,
                    purpose="analysis"
                )
            
            # Create conversation
            conversation = self.client.conversations.create(
                title=f"Batch Analysis: {uploaded_file.filename}",
                model="gpt-4"
            )
            
            # Analyze
            response = self.client.conversations.send_message(
                conversation_id=conversation.id,
                message=f"Analyze this document (file_id: {uploaded_file.file_id}) and provide a {analysis_type}.",
                tools=["file_analyzer"]
            )
            
            return {
                "file_path": file_path,
                "file_id": uploaded_file.file_id,
                "analysis": response.content,
                "tokens_used": response.tokens_used,
                "status": "success"
            }
        except Exception as e:
            return {
                "file_path": file_path,
                "error": str(e),
                "status": "failed"
            }

# Example usage
batch_processor = BatchProcessor(client, max_workers=3)
file_list = ["doc1.pdf", "doc2.docx", "doc3.txt"]
results = batch_processor.process_documents_batch(file_list, "summary")

for result in results:
    if result["status"] == "success":
        print(f"✅ {result['file_path']}: Analysis completed")
    else:
        print(f"❌ {result['file_path']}: {result['error']}")
```

### 3.2 Streaming Responses

```python
def stream_conversation(conversation_id, message):
    """
    Handle streaming responses for real-time interaction
    """
    try:
        # Send message with streaming enabled
        stream = client.conversations.send_message_stream(
            conversation_id=conversation_id,
            message=message
        )
        
        full_response = ""
        for chunk in stream:
            if chunk.type == "content":
                print(chunk.content, end="", flush=True)
                full_response += chunk.content
            elif chunk.type == "tool_call":
                print(f"\n[Using tool: {chunk.tool_name}]\n")
            elif chunk.type == "error":
                print(f"\nError: {chunk.error}\n")
                break
        
        print("\n")  # New line after completion
        return full_response
    
    except Exception as e:
        print(f"Streaming error: {e}")
        return None

# Example usage
conversation = client.conversations.create(title="Streaming Chat")
response = stream_conversation(
    conversation.id,
    "Explain quantum computing in simple terms, step by step."
)
```

### 3.3 Custom Tool Integration

```python
class CustomToolManager:
    def __init__(self, client):
        self.client = client
        self.custom_tools = {}
    
    def register_tool(self, tool_name, tool_function, description):
        """
        Register a custom tool function
        """
        self.custom_tools[tool_name] = {
            "function": tool_function,
            "description": description
        }
    
    def execute_with_custom_tools(self, conversation_id, message, available_tools=None):
        """
        Execute conversation with custom tool support
        """
        # Send initial message
        response = self.client.conversations.send_message(
            conversation_id=conversation_id,
            message=message,
            tools=available_tools or list(self.custom_tools.keys())
        )
        
        # Check if AI wants to use custom tools
        if hasattr(response, 'tool_calls') and response.tool_calls:
            for tool_call in response.tool_calls:
                if tool_call.name in self.custom_tools:
                    # Execute custom tool
                    tool_result = self.custom_tools[tool_call.name]["function"](
                        **tool_call.parameters
                    )
                    
                    # Send tool result back to AI
                    follow_up = self.client.conversations.send_message(
                        conversation_id=conversation_id,
                        message=f"Tool '{tool_call.name}' returned: {tool_result}"
                    )
                    
                    return follow_up.content
        
        return response.content

# Example custom tool functions
def calculate_roi(investment, returns, time_period):
    """
    Calculate Return on Investment
    """
    roi = ((returns - investment) / investment) * 100
    annual_roi = roi / time_period if time_period > 0 else roi
    return {
        "total_roi": round(roi, 2),
        "annual_roi": round(annual_roi, 2),
        "profit": returns - investment
    }

def fetch_stock_price(symbol):
    """
    Fetch current stock price (mock implementation)
    """
    # In real implementation, you'd call a stock API
    mock_prices = {
        "AAPL": 150.25,
        "GOOGL": 2800.50,
        "MSFT": 300.75
    }
    return mock_prices.get(symbol.upper(), "Symbol not found")

# Register custom tools
tool_manager = CustomToolManager(client)
tool_manager.register_tool("calculate_roi", calculate_roi, "Calculate return on investment")
tool_manager.register_tool("fetch_stock_price", fetch_stock_price, "Get current stock price")

# Use custom tools
conversation = client.conversations.create(title="Financial Analysis")
result = tool_manager.execute_with_custom_tools(
    conversation.id,
    "I invested $10,000 in a project 2 years ago and got back $15,000. What's my ROI?",
    available_tools=["calculate_roi"]
)
print(result)
```

## 4. Error Handling and Best Practices

### 4.1 Robust Error Handling

```python
import time
from functools import wraps

def retry_on_failure(max_retries=3, delay=1, backoff=2):
    """
    Decorator for retrying failed API calls
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            current_delay = delay
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        raise e
                    
                    print(f"Attempt {retries} failed: {e}. Retrying in {current_delay} seconds...")
                    time.sleep(current_delay)
                    current_delay *= backoff
            
            return None
        return wrapper
    return decorator

class RobustTraeAIClient:
    def __init__(self, api_key, **kwargs):
        self.client = TraeAI(api_key=api_key, **kwargs)
    
    @retry_on_failure(max_retries=3)
    def safe_send_message(self, conversation_id, message, **kwargs):
        """
        Send message with automatic retry on failure
        """
        try:
            response = self.client.conversations.send_message(
                conversation_id=conversation_id,
                message=message,
                **kwargs
            )
            return {
                "success": True,
                "data": response,
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "data": None,
                "error": str(e)
            }
    
    def validate_conversation_exists(self, conversation_id):
        """
        Validate that a conversation exists before using it
        """
        try:
            conversation = self.client.conversations.get(conversation_id)
            return conversation is not None
        except:
            return False
    
    def safe_file_upload(self, file_path, **kwargs):
        """
        Safely upload a file with validation
        """
        import os
        
        # Validate file exists
        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}
        
        # Check file size (10MB limit)
        file_size = os.path.getsize(file_path)
        if file_size > 10 * 1024 * 1024:  # 10MB
            return {"success": False, "error": "File too large (max 10MB)"}
        
        try:
            with open(file_path, 'rb') as file:
                uploaded_file = self.client.files.upload(file=file, **kwargs)
            return {"success": True, "data": uploaded_file, "error": None}
        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}

# Example usage
robust_client = RobustTraeAIClient(api_key="your_api_key")

# Safe message sending
result = robust_client.safe_send_message(
    conversation_id="conv_123",
    message="Hello, world!"
)

if result["success"]:
    print(f"Message sent successfully: {result['data'].content}")
else:
    print(f"Failed to send message: {result['error']}")
```

### 4.2 Rate Limiting and Usage Optimization

```python
import time
from collections import deque

class RateLimitedClient:
    def __init__(self, client, requests_per_minute=60):
        self.client = client
        self.requests_per_minute = requests_per_minute
        self.request_times = deque()
    
    def _wait_if_needed(self):
        """
        Wait if we're approaching rate limits
        """
        now = time.time()
        
        # Remove requests older than 1 minute
        while self.request_times and now - self.request_times[0] > 60:
            self.request_times.popleft()
        
        # If we're at the limit, wait
        if len(self.request_times) >= self.requests_per_minute:
            sleep_time = 60 - (now - self.request_times[0])
            if sleep_time > 0:
                print(f"Rate limit reached. Waiting {sleep_time:.1f} seconds...")
                time.sleep(sleep_time)
        
        self.request_times.append(now)
    
    def send_message(self, *args, **kwargs):
        """
        Send message with rate limiting
        """
        self._wait_if_needed()
        return self.client.conversations.send_message(*args, **kwargs)
    
    def optimize_token_usage(self, message, max_tokens=None):
        """
        Optimize message for token efficiency
        """
        # Estimate tokens (rough approximation: 1 token ≈ 4 characters)
        estimated_tokens = len(message) // 4
        
        if max_tokens and estimated_tokens > max_tokens:
            # Truncate message to fit token limit
            max_chars = max_tokens * 4
            truncated_message = message[:max_chars] + "..."
            print(f"Message truncated to fit {max_tokens} token limit")
            return truncated_message
        
        return message

# Example usage
rate_limited_client = RateLimitedClient(client, requests_per_minute=50)

# Send multiple messages with automatic rate limiting
for i in range(10):
    message = f"This is message number {i+1}"
    optimized_message = rate_limited_client.optimize_token_usage(message, max_tokens=100)
    response = rate_limited_client.send_message(
        conversation_id="conv_123",
        message=optimized_message
    )
    print(f"Response {i+1}: {response.content[:50]}...")
```

## 5. Testing and Debugging

### 5.1 Unit Testing

```python
import unittest
from unittest.mock import Mock, patch

class TestTraeAIIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TraeAI(api_key="test_key")
    
    @patch('trae_ai.TraeAI.conversations')
    def test_create_conversation(self, mock_conversations):
        # Mock the response
        mock_response = Mock()
        mock_response.id = "conv_test_123"
        mock_response.title = "Test Conversation"
        mock_conversations.create.return_value = mock_response
        
        # Test conversation creation
        conversation = self.client.conversations.create(
            title="Test Conversation",
            model="gpt-4"
        )
        
        self.assertEqual(conversation.id, "conv_test_123")
        self.assertEqual(conversation.title, "Test Conversation")
        mock_conversations.create.assert_called_once()
    
    @patch('trae_ai.TraeAI.conversations')
    def test_send_message(self, mock_conversations):
        # Mock the response
        mock_response = Mock()
        mock_response.content = "Test response"
        mock_response.tokens_used = 50
        mock_conversations.send_message.return_value = mock_response
        
        # Test message sending
        response = self.client.conversations.send_message(
            conversation_id="conv_test_123",
            message="Test message"
        )
        
        self.assertEqual(response.content, "Test response")
        self.assertEqual(response.tokens_used, 50)
    
    def test_error_handling(self):
        # Test error handling
        with self.assertRaises(Exception):
            self.client.conversations.send_message(
                conversation_id="invalid_id",
                message="Test"
            )

if __name__ == '__main__':
    unittest.main()
```

### 5.2 Integration Testing

```python
def integration_test_suite():
    """
    Comprehensive integration test suite
    """
    client = TraeAI(api_key="your_test_api_key")
    test_results = []
    
    # Test 1: Basic conversation
    try:
        conversation = client.conversations.create(title="Integration Test")
        response = client.conversations.send_message(
            conversation_id=conversation.id,
            message="Hello, this is a test message."
        )
        test_results.append({
            "test": "Basic Conversation",
            "status": "PASS",
            "details": f"Response received: {len(response.content)} characters"
        })
    except Exception as e:
        test_results.append({
            "test": "Basic Conversation",
            "status": "FAIL",
            "details": str(e)
        })
    
    # Test 2: File upload and analysis
    try:
        # Create a test file
        test_content = "This is a test document for integration testing."
        with open("test_file.txt", "w") as f:
            f.write(test_content)
        
        # Upload and analyze
        with open("test_file.txt", "rb") as f:
            uploaded_file = client.files.upload(file=f, purpose="analysis")
        
        analysis_response = client.conversations.send_message(
            conversation_id=conversation.id,
            message=f"Analyze this file: {uploaded_file.file_id}",
            tools=["file_analyzer"]
        )
        
        test_results.append({
            "test": "File Upload and Analysis",
            "status": "PASS",
            "details": f"File analyzed successfully: {uploaded_file.filename}"
        })
    except Exception as e:
        test_results.append({
            "test": "File Upload and Analysis",
            "status": "FAIL",
            "details": str(e)
        })
    
    # Test 3: Tool usage
    try:
        tool_response = client.conversations.send_message(
            conversation_id=conversation.id,
            message="Search for information about artificial intelligence trends in 2024",
            tools=["web_search"]
        )
        
        test_results.append({
            "test": "Tool Usage (Web Search)",
            "status": "PASS",
            "details": f"Search completed, response length: {len(tool_response.content)}"
        })
    except Exception as e:
        test_results.append({
            "test": "Tool Usage (Web Search)",
            "status": "FAIL",
            "details": str(e)
        })
    
    # Print results
    print("\n=== Integration Test Results ===")
    for result in test_results:
        status_emoji = "✅" if result["status"] == "PASS" else "❌"
        print(f"{status_emoji} {result['test']}: {result['status']}")
        print(f"   Details: {result['details']}\n")
    
    # Cleanup
    import os
    if os.path.exists("test_file.txt"):
        os.remove("test_file.txt")
    
    return test_results

# Run integration tests
if __name__ == "__main__":
    integration_test_suite()
```

This comprehensive usage examples document provides practical implementations for common use cases, advanced integration patterns, error handling strategies, and testing approaches. These examples serve as a foundation for building robust applications with Trae AI.