---
applyTo: `**`
---
# Copilot Coding Agent Guidelines for SkyPANEL

## Overview
This document establishes comprehensive guidelines for GitHub Copilot to function as a high-end coding agent for the SkyPANEL project. These rules ensure consistent, professional, and efficient code generation and project management.

## Core Agent Principles

### 1. Professional Code Standards
- **Always** write production-ready code with proper error handling
- **Never** generate placeholder code or TODOs without implementation
- **Always** include comprehensive comments and documentation
- **Must** follow project's existing code style and patterns
- **Always** validate inputs and handle edge cases
- **Must** implement proper logging and debugging capabilities

### 2. Security-First Approach
- **Always** sanitize user inputs and validate data
- **Never** hardcode sensitive information (passwords, API keys, secrets)
- **Must** implement proper authentication and authorization
- **Always** use environment variables for configuration
- **Must** follow OWASP security guidelines
- **Always** implement rate limiting and request validation

### 3. Performance Optimization
- **Always** consider performance implications in code design
- **Must** implement efficient algorithms and data structures
- **Always** use appropriate caching mechanisms
- **Must** optimize database queries and API calls
- **Always** consider memory usage and garbage collection
- **Must** implement lazy loading where applicable

## Tool Integration Rules

### #thinking Tool Usage
```
When to use #thinking:
- Before writing any complex code logic
- When analyzing requirements or user requests
- Before making architectural decisions
- When debugging or troubleshooting issues
- Before refactoring existing code

Format:
#thinking
1. Problem Analysis: [Describe the problem/requirement]
2. Approach Evaluation: [List possible solutions and their pros/cons]
3. Implementation Strategy: [Chosen approach with reasoning]
4. Potential Issues: [Anticipated challenges and solutions]
5. Testing Considerations: [How to validate the solution]
```

### #codebase Tool Usage
```
When to use #codebase:
- Before modifying existing files
- When understanding project structure
- Before adding new features that interact with existing code
- When looking for similar implementations
- Before refactoring to understand dependencies

Search Strategy:
- Use semantic search for conceptual understanding
- Use file path search for specific components
- Always review related files before making changes
- Understand the full context before implementation
```

### #changes Tool Usage
```
When to use #changes:
- Before modifying files to understand recent changes
- When investigating bugs or issues
- Before refactoring to understand change history
- When reviewing code evolution patterns
- To understand team development patterns

Implementation Rules:
- Always check recent changes before major modifications
- Understand the reasoning behind previous changes
- Maintain consistency with recent development patterns
- Consider impact on recent work by other developers
```

### #mcp-server-neon Tool Usage
```
When to use #mcp-server-neon:
- For all database-related operations
- When designing database schemas
- For query optimization and analysis
- When implementing data models
- For database migration planning

Database Standards:
- Always use parameterized queries
- Implement proper indexing strategies
- Use transactions for data consistency
- Implement connection pooling
- Follow normalization principles
- Include proper foreign key constraints
```

## Code Generation Rules

### 1. File Structure and Organization
```typescript
// File header template for all files
/**
 * @fileoverview [Brief description of file purpose]
 * @author SkyPANEL Development Team
 * @created [YYYY-MM-DD]
 * @modified [YYYY-MM-DD]
 * @version [semantic version]
 */

// Required imports at top
import { ... } from '...';

// Type definitions
interface/type definitions...

// Constants and configuration
const CONFIG = { ... };

// Main implementation
export class/function...

// Export statements at bottom
export { ... };
```

### 2. Error Handling Standards
```typescript
// Always implement comprehensive error handling
try {
    // Main logic here
    const result = await operation();
    
    // Validate results
    if (!isValidResult(result)) {
        throw new ValidationError('Invalid operation result');
    }
    
    return result;
} catch (error) {
    // Log error with context
    logger.error('Operation failed', {
        operation: 'operationName',
        params: sanitizedParams,
        error: error.message,
        stack: error.stack
    });
    
    // Handle specific error types
    if (error instanceof ValidationError) {
        throw new APIError('Validation failed', 400);
    }
    
    // Re-throw unknown errors
    throw new APIError('Internal server error', 500);
}
```

### 3. API Development Standards
```typescript
// Controller template
export class ControllerName {
    constructor(
        private readonly service: ServiceName,
        private readonly logger: Logger
    ) {}
    
    @Route('POST', '/endpoint')
    @Middleware([auth, validation, rateLimit])
    async handleRequest(req: Request, res: Response): Promise<Response> {
        const startTime = Date.now();
        
        try {
            // Input validation
            const validatedData = await validateInput(req.body);
            
            // Business logic
            const result = await this.service.processRequest(validatedData);
            
            // Success response
            this.logger.info('Request processed successfully', {
                endpoint: req.path,
                duration: Date.now() - startTime,
                userId: req.user?.id
            });
            
            return res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            // Error handling
            return this.handleError(error, res, req);
        }
    }
}
```

### 4. Database Model Standards
```typescript
// Model template with proper validation
@Entity('table_name')
export class ModelName {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column({ type: 'varchar', length: 255, nullable: false })
    @IsNotEmpty()
    @IsString()
    @Length(1, 255)
    name: string;
    
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
    
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
    
    // Relationships with proper loading strategies
    @OneToMany(() => RelatedModel, related => related.parent, { lazy: true })
    children: Promise<RelatedModel[]>;
    
    // Custom methods with proper typing
    async getActiveChildren(): Promise<RelatedModel[]> {
        const children = await this.children;
        return children.filter(child => child.isActive);
    }
}
```

## Testing Requirements

### 1. Unit Testing Standards
```typescript
// Test file template
describe('ComponentName', () => {
    let component: ComponentName;
    let mockDependency: jest.Mocked<DependencyType>;
    
    beforeEach(() => {
        mockDependency = createMockDependency();
        component = new ComponentName(mockDependency);
    });
    
    describe('methodName', () => {
        it('should handle successful case', async () => {
            // Arrange
            const input = createValidInput();
            mockDependency.method.mockResolvedValue(expectedResult);
            
            // Act
            const result = await component.methodName(input);
            
            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockDependency.method).toHaveBeenCalledWith(input);
        });
        
        it('should handle error case', async () => {
            // Arrange
            const input = createInvalidInput();
            mockDependency.method.mockRejectedValue(new Error('Test error'));
            
            // Act & Assert
            await expect(component.methodName(input)).rejects.toThrow('Test error');
        });
    });
});
```

### 2. Integration Testing Standards
- Always create integration tests for API endpoints
- Test database interactions with test database
- Mock external services and APIs
- Test authentication and authorization flows
- Validate error handling and edge cases

## Documentation Requirements

### 1. Code Documentation
```typescript
/**
 * Processes user authentication and generates JWT tokens
 * 
 * @param credentials - User login credentials
 * @param options - Authentication options including remember me
 * @returns Promise resolving to authentication result with token
 * 
 * @throws {ValidationError} When credentials are invalid
 * @throws {AuthenticationError} When authentication fails
 * @throws {RateLimitError} When rate limit is exceeded
 * 
 * @example
 * ```typescript
 * const result = await authenticateUser(
 *   { email: 'user@example.com', password: 'password' },
 *   { rememberMe: true }
 * );
 * console.log(result.token);
 * ```
 */
async function authenticateUser(
    credentials: LoginCredentials,
    options: AuthOptions = {}
): Promise<AuthResult> {
    // Implementation...
}
```

### 2. API Documentation
- Always include OpenAPI/Swagger documentation
- Document all endpoints with examples
- Include error response formats
- Document authentication requirements
- Provide example requests and responses

## Workflow Integration

### 1. Before Writing Code
1. Use `#thinking` to analyze the requirement
2. Use `#codebase` to understand existing implementation
3. Use `#changes` to check recent modifications
4. Plan the implementation approach
5. Consider database implications with `#mcp-server-neon`

### 2. During Implementation
1. Follow established patterns from codebase
2. Implement comprehensive error handling
3. Add appropriate logging and monitoring
4. Include input validation and sanitization
5. Write self-documenting code with comments

### 3. After Implementation
1. Write comprehensive tests
2. Update documentation
3. Consider performance implications
4. Review security considerations
5. Plan deployment and monitoring

## Quality Assurance Rules

### 1. Code Review Checklist
- [ ] Follows project coding standards
- [ ] Includes comprehensive error handling
- [ ] Has appropriate test coverage
- [ ] Includes proper documentation
- [ ] Considers security implications
- [ ] Optimized for performance
- [ ] Follows database best practices
- [ ] Includes proper logging

### 2. Performance Benchmarks
- API response times < 200ms for simple operations
- Database queries optimized with proper indexing
- Memory usage monitored and optimized
- CPU usage kept under reasonable limits
- Proper caching implementation

## Continuous Improvement

### 1. Learning and Adaptation
- Analyze patterns from successful implementations
- Learn from error patterns and debugging sessions
- Adapt to project-specific requirements
- Incorporate feedback from code reviews
- Stay updated with best practices

### 2. Tool Optimization
- Continuously improve tool usage efficiency
- Develop better search strategies for `#codebase`
- Optimize database interactions with `#mcp-server-neon`
- Improve analytical processes with `#thinking`
- Better change tracking with `#changes`

## Enforcement Rules

1. **NEVER** generate code without following these guidelines
2. **ALWAYS** use the specified tools when applicable
3. **MUST** include comprehensive error handling
4. **ALWAYS** write tests for new functionality
5. **NEVER** compromise on security practices
6. **MUST** maintain code quality standards
7. **ALWAYS** document code and APIs properly
8. **NEVER** generate incomplete or placeholder code

These guidelines ensure that GitHub Copilot operates as a professional, high-quality coding agent that produces enterprise-grade code for the SkyPANEL project.
