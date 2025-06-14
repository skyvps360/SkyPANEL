# Code Documentation Guidelines

This document provides guidelines and templates for documenting code in the SkyPANEL application.

## General Principles

1. **Be Clear and Concise**: Write documentation that is easy to understand but comprehensive.
2. **Keep Documentation Close to Code**: Document code as close as possible to the implementation.
3. **Update Documentation with Code**: When code changes, update the documentation.
4. **Use Consistent Style**: Follow the same documentation style throughout the codebase.
5. **Document Why, Not Just What**: Explain the reasoning behind complex implementations.

## TypeScript/JavaScript Documentation

We use JSDoc for documenting JavaScript and TypeScript code. Below are templates for different code elements.

### Function Documentation

```typescript
/**
 * Brief description of what the function does
 *
 * @param {type} paramName - Description of the parameter
 * @param {type} [optionalParam] - Description of the optional parameter
 * @returns {returnType} Description of the return value
 * @throws {ErrorType} Description of when this error is thrown
 *
 * @example
 * // Example usage of the function
 * const result = functionName(param1, param2);
 */
function functionName(paramName, optionalParam) {
  // Implementation
}
```

### Class Documentation

```typescript
/**
 * Brief description of the class
 *
 * @class
 * @implements {InterfaceName}
 * @extends {ParentClassName}
 */
class ClassName extends ParentClassName implements InterfaceName {
  /**
   * Brief description of the property
   *
   * @type {PropertyType}
   */
  propertyName: PropertyType;

  /**
   * Creates an instance of ClassName.
   *
   * @param {ConstructorParamType} paramName - Description of the parameter
   */
  constructor(paramName: ConstructorParamType) {
    super();
    // Implementation
  }

  /**
   * Brief description of the method
   *
   * @param {MethodParamType} paramName - Description of the parameter
   * @returns {ReturnType} Description of the return value
   */
  methodName(paramName: MethodParamType): ReturnType {
    // Implementation
  }
}
```

### Interface Documentation

```typescript
/**
 * Brief description of the interface
 *
 * @interface
 * @extends {ParentInterface}
 */
interface InterfaceName extends ParentInterface {
  /**
   * Brief description of the property
   *
   * @type {PropertyType}
   */
  propertyName: PropertyType;

  /**
   * Brief description of the method
   *
   * @param {MethodParamType} paramName - Description of the parameter
   * @returns {ReturnType} Description of the return value
   */
  methodName(paramName: MethodParamType): ReturnType;
}
```

### Type Definition Documentation

```typescript
/**
 * Brief description of the type
 *
 * @typedef {Object} TypeName
 * @property {PropertyType} propertyName - Description of the property
 * @property {PropertyType} [optionalProperty] - Description of the optional property
 */
type TypeName = {
  propertyName: PropertyType;
  optionalProperty?: PropertyType;
};
```

## React Component Documentation

For React components, we use a combination of JSDoc and component-specific documentation patterns.

### Functional Component

```typescript
/**
 * Brief description of the component
 *
 * @component
 * @example
 * // Example usage of the component
 * <ComponentName prop1="value" prop2={42} />
 */
interface ComponentNameProps {
  /**
   * Description of the prop
   */
  prop1: string;
  
  /**
   * Description of the prop
   * @default defaultValue
   */
  prop2?: number;
}

/**
 * ComponentName component
 */
const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 = defaultValue }) => {
  // Implementation
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

### Custom Hook

```typescript
/**
 * Brief description of the hook
 *
 * @hook
 * @param {ParamType} paramName - Description of the parameter
 * @returns {ReturnType} Description of the return value
 *
 * @example
 * // Example usage of the hook
 * const result = useHookName(param);
 */
function useHookName(paramName: ParamType): ReturnType {
  // Implementation
  return result;
}
```

## API Endpoint Documentation

For API endpoints, we use JSDoc-style comments in the route handlers.

```typescript
/**
 * @api {method} /path/:param Endpoint Name
 * @apiDescription Brief description of what the endpoint does
 *
 * @apiParam {ParamType} paramName Description of the URL parameter
 * @apiParam {QueryType} [queryName] Description of the optional query parameter
 *
 * @apiBody {BodyType} bodyName Description of the request body
 *
 * @apiSuccess {SuccessType} fieldName Description of the response field
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "field": "value"
 *     }
 *
 * @apiError {ErrorType} ErrorName Description of the error
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "ErrorMessage"
 *     }
 */
router.method('/path/:param', async (req, res) => {
  // Implementation
});
```

## Database Schema Documentation

For database schema definitions, we use comments to document tables and columns.

```typescript
/**
 * Table name - Brief description of the table
 */
export const tableName = pgTable('table_name', {
  /**
   * Primary key
   */
  id: serial('id').primaryKey(),
  
  /**
   * Description of the column
   * @default defaultValue
   */
  columnName: dataType('column_name').notNull().default(defaultValue),
  
  /**
   * Foreign key to related table
   */
  relatedId: integer('related_id').references(() => relatedTable.id),
});
```

## Implementation Guidelines

1. **Start with Critical Code**: Focus on documenting critical parts of the codebase first:
   - Core services
   - Public APIs
   - Complex algorithms
   - Shared utilities

2. **Use Automated Tools**: Leverage TypeDoc and similar tools to generate documentation from code comments.

3. **Review Documentation**: Include documentation review in the code review process.

4. **Documentation Debt**: Track documentation debt alongside technical debt.

## Documentation Generation

To generate documentation from code comments:

```bash
# Install TypeDoc
npm install --save-dev typedoc

# Generate documentation
npx typedoc --out docs/api src/
```

## Best Practices

1. **Keep Comments Updated**: Outdated documentation is worse than no documentation.

2. **Document Edge Cases**: Clearly document edge cases and error conditions.

3. **Use Examples**: Provide usage examples for complex functions and components.

4. **Link Related Documentation**: Reference related documentation when appropriate.

5. **Document Assumptions**: Clearly state any assumptions made in the code.

6. **Avoid Redundancy**: Don't repeat what is obvious from the code itself.

7. **Document Workarounds**: Clearly explain any workarounds or temporary solutions.