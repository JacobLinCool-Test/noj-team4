# Repository Maintainability Evaluation Report

**Repository:** noj-team4  
**Evaluation Date:** 2025-12-29  
**Total Files Analyzed:** 474 TypeScript files across 3 main applications (API, Web, Judge)

---

## Maintainability Score Summary

- **Code Structure & Modularity:** 4 / 5
- **Readability & Naming:** 4 / 5
- **Documentation & Comments:** 2 / 5
- **Dependency Management & Coupling:** 3 / 5
- **Error Handling & Robustness:** 4 / 5
- **Testability:** 3 / 5
- **Consistency & Style:** 4 / 5

---

## Overall Maintainability Score

- **Total:** 24 / 35
- **Normalized Score:** 3.4 / 5

---

## Detailed Category Analysis

### 1. Code Structure & Modularity: 4 / 5

**Strengths:**
- **Well-organized monorepo structure** with clear separation between `apps/` (api, web, judge, contest) and `packages/` (shared-ui)
- **NestJS modular architecture** properly implemented with 27+ distinct feature modules (auth, course, problem, submission, ai-assistant, etc.)
- **Clean separation of concerns** with dedicated layers: controllers, services, DTOs (63 DTO files), guards, and decorators
- **Domain-driven organization** where each module contains its complete set of files (controller, service, module, DTOs)
- **Prisma schema centralization** provides single source of truth for data models

**Weaknesses:**
- **Excessive service file size**: `course.service.ts` is 2,474 lines - far too large for a single service, indicating insufficient decomposition
- **Missing abstraction layers** for common patterns like pagination, filtering, and permission checks that are repeated across services
- **No dedicated repository pattern** - services directly use Prisma, mixing business logic with data access

**Justification:**
The codebase demonstrates strong modular organization at the macro level (modules, features), but individual services suffer from the "God Object" anti-pattern. The `course.service.ts` file handling course management, member management, problem management, and homework integration in 2,474 lines violates Single Responsibility Principle. Similarly, `auth.service.ts` (1,040 lines) handles authentication, authorization, email verification, password reset, and token management all in one class.

---

### 2. Readability & Naming: 4 / 5

**Strengths:**
- **Consistent naming conventions** across the codebase (camelCase for variables/methods, PascalCase for classes/types)
- **Descriptive function names** like `ensureHomeworkProblemAccess()`, `validateCourseHomeworkContext()`, `canViewUnlistedProblem()`
- **Clear DTO naming** following patterns like `Create*Dto`, `Update*Dto`, `*QueryDto`, `*ResponseDto`
- **Type safety** with TypeScript strict mode enabled (`strictNullChecks`, `noImplicitAny`)
- **Semantic variable names** that clearly convey intent (e.g., `allowedOrigins`, `refreshTtlSeconds`, `tokenHash`)

**Weaknesses:**
- **Complex nested logic** in permission checks reduces readability (e.g., `canViewSubmission()` method with 4+ levels of conditional logic)
- **Inconsistent error code patterns**: Some use string constants (`'PROBLEM_NOT_FOUND'`), others use enum-like types
- **Magic numbers** present in code (e.g., `5` for max active tokens, `100` for page size limits) without named constants
- **Long method signatures** with 5+ parameters make function calls harder to read

**Justification:**
The code is generally well-named and follows TypeScript best practices. However, readability suffers in complex business logic sections where deeply nested conditionals and multiple permission checks create high cognitive load. The `auth.service.ts` method `buildErrorPayload()` has a 180-line switch statement with embedded translations - this could be externalized for better readability.

---

### 3. Documentation & Comments: 2 / 5

**Strengths:**
- **Some JSDoc comments** present on complex methods like `createWithZip()` in submission service
- **README files** exist for each application subdirectory (though mostly default NestJS boilerplate)
- **Type definitions** serve as inline documentation through TypeScript's type system
- **Prisma schema** is self-documenting with clear field names and relationships

**Weaknesses:**
- **No comprehensive API documentation** - no OpenAPI/Swagger setup despite being a REST API
- **Missing module-level documentation** explaining the purpose and responsibilities of each module
- **Sparse inline comments** - complex business logic like quota checking, permission validation, and token refresh logic lacks explanatory comments
- **No architecture documentation** explaining system design decisions, data flow, or integration patterns
- **README files are boilerplate** - they don't explain the NOJ-specific functionality, setup procedures, or business logic
- **No code-level documentation** for critical functions like `refresh()` token validation logic or `computeRefreshTokenDigest()`

**Justification:**
This is a significant weakness. The codebase has ~84,000 lines of TypeScript with only 2 unit test files (`.spec.ts`) in the main source. Complex authentication flows (registration, login, token refresh, email verification, password reset) lack documentation. The `auth.service.ts` refresh token logic uses a custom digest system and iterative hash verification but has zero explanatory comments. New developers would struggle to understand the system without extensive code reading.

---

### 4. Dependency Management & Coupling: 3 / 5

**Strengths:**
- **pnpm workspace** properly configured for monorepo management
- **Dependency injection** through NestJS's IoC container reduces tight coupling
- **Package.json overrides** address security vulnerabilities (`jws`, `body-parser`)
- **Shared UI package** prevents code duplication between frontend applications
- **Module imports** properly scoped with barrel exports (`index.ts`)

**Weaknesses:**
- **Circular dependency risk**: `forwardRef()` used in multiple places (e.g., `ProblemService` ↔ `TranslatorService`, `CourseService` ↔ `ExamService`)
- **Global state concerns**: Redis and system config accessed through services that could be called from anywhere
- **Direct MinIO coupling** throughout services instead of through an abstraction layer
- **Tight Prisma coupling** - changing database schema would require changes in 100+ service methods
- **Mixed concerns**: Email sending logic embedded directly in `auth.service.ts` instead of delegated to a dedicated email service

**Justification:**
While NestJS's dependency injection provides a foundation for loose coupling, the implementation shows several anti-patterns. The circular dependencies requiring `forwardRef()` indicate design issues where modules have unclear boundaries. Services like `SubmissionService` directly depend on `MinioService` and `QueueService`, making it difficult to test or swap implementations. The 687-line `submission.service.ts` directly couples submission logic with file storage, queue management, permission checking, and database access.

---

### 5. Error Handling & Robustness: 4 / 5

**Strengths:**
- **Consistent HTTP exceptions** using NestJS's built-in exception classes (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`)
- **Structured error responses** with error codes and localized messages (zh-TW and en)
- **Defensive validation** using `class-validator` decorators in DTOs
- **Transaction safety** - complex operations wrapped in Prisma transactions (e.g., password reset, email verification)
- **Graceful email failures** - email sending wrapped in try-catch with logging (`sendVerificationEmailSafe()`)
- **Input sanitization** - email addresses normalized to lowercase, usernames trimmed
- **Rate limiting** implemented via `EmailRateLimiterService` to prevent abuse

**Weaknesses:**
- **Silent failures** in some areas (e.g., AI translation failures in `problem.service.ts` are caught but not reported to user)
- **Inconsistent error detail logging** - some errors log full stack traces, others just message strings
- **Missing validation** for file uploads (e.g., ZIP submission size limits, file type validation)
- **No circuit breaker pattern** for external service calls (MinIO, Redis, AI services)
- **Weak token generation** - uses `randomBytes(32)` but doesn't validate entropy source availability

**Justification:**
The codebase demonstrates solid error handling practices with localized error messages, appropriate HTTP status codes, and transaction safety. The `auth.service.ts` shows excellent error handling with audit logging for all authentication actions (successful and failed). However, error handling is inconsistent across modules - some services fail fast with exceptions, while others silently log errors and continue. The lack of circuit breakers means that external service failures (MinIO down, Redis unavailable) could cascade into system-wide issues.

---

### 6. Testability: 3 / 5

**Strengths:**
- **NestJS testing utilities** available (`@nestjs/testing` in devDependencies)
- **E2E tests present** - 5 E2E test files covering auth, submission, homework, and judge pipeline
- **Test utilities** extracted (`test/utils/test-utils.ts`) for setup/teardown
- **Dependency injection** makes services theoretically easy to mock
- **Jest configuration** properly set up with TypeScript support

**Weaknesses:**
- **Minimal unit test coverage** - only 2 `.spec.ts` files found in main source code (474 total TS files)
- **Large service methods** difficult to test in isolation (2,474-line service would require complex test setup)
- **Direct database coupling** makes unit testing slow and require test database setup
- **Hard-coded dependencies** in some places (e.g., `ConfigService` values read in constructors)
- **No test coverage metrics** visible in the codebase
- **No mocking infrastructure** apparent for external services (MinIO, Redis, Email)
- **Async operations** not always properly awaited, making tests potentially flaky

**Justification:**
While the project has good E2E test coverage for critical paths (18,200 lines in `judge-pipeline.e2e-spec.ts`), the unit test coverage is severely lacking. Services with complex business logic like `auth.service.ts` (1,040 lines), `submission.service.ts` (687 lines), and `problem.service.ts` (560 lines) have zero unit tests. This means regression testing relies entirely on E2E tests, which are slower and more brittle. The high method complexity (e.g., 200+ line methods) and tight coupling to Prisma make it impractical to write focused unit tests without significant refactoring.

---

### 7. Consistency & Style: 4 / 5

**Strengths:**
- **ESLint + Prettier** configured for all applications with consistent rules
- **TypeScript strict mode** enforced across all apps
- **Consistent file naming** - kebab-case for files, module boundaries clear
- **Import organization** follows a consistent pattern (external deps → NestJS → local modules → types)
- **DTO validation patterns** consistently use `class-validator` decorators
- **HTTP method semantics** properly respected (GET for queries, POST for creation, PATCH for updates)
- **Similar patterns** across modules (controller → service → DTO structure)

**Weaknesses:**
- **Inconsistent comment styles** - some JSDoc, some inline, some none
- **Mixed query patterns** - some use query params, some use path params, some use request body for filters
- **Varied transaction usage** - some operations use transactions, similar operations don't
- **Inconsistent null handling** - some code uses `null`, some uses `undefined`, some uses both
- **Variable locale handling** - some functions accept locale, some read from headers, some have hardcoded fallbacks

**Justification:**
The codebase benefits from strong tooling (ESLint, Prettier, TypeScript) that enforces syntactic consistency. The NestJS framework provides structural consistency through decorators and modules. However, semantic consistency varies - similar operations (e.g., permission checks, pagination, filtering) are implemented differently across services. The `course.service.ts` has inline helper methods while `problem.service.ts` uses separate mapper files. Error handling patterns differ between modules despite similar requirements.

---

## Key Maintainability Risks

### 1. **God Object Services** (Critical Risk)
**Technical Details:**
- `course.service.ts`: 2,474 lines handling course CRUD, member management, problem management, invitations, join requests, exports, and exam integration
- `auth.service.ts`: 1,040 lines handling authentication, registration, login, token management, email verification, password reset, audit logging, and error localization
- `admin.service.ts`: 1,301 lines handling user management, system configuration, demo data, email domains, and AI settings

**Impact:**
- **High change risk** - any modification has potential to break multiple features
- **Difficult code review** - reviewers must understand 1000+ lines of context
- **Merge conflicts** - multiple developers working on same large file
- **Testing complexity** - unit tests require mocking dozens of dependencies
- **Onboarding barrier** - new developers overwhelmed by file size

**Recommendation:**
Decompose large services into smaller, focused services using vertical slicing:
- Split `course.service.ts` → `CourseService`, `CourseMemberService`, `CourseProblemService`, `CourseExportService`
- Split `auth.service.ts` → `AuthenticationService`, `TokenService`, `EmailVerificationService`, `PasswordResetService`
- Split `admin.service.ts` → `UserAdminService`, `SystemConfigService`, `DemoDataService`, `EmailDomainService`

---

### 2. **Insufficient Test Coverage** (High Risk)
**Technical Details:**
- Only 2 unit test files (`.spec.ts`) found in 474 TypeScript source files
- E2E tests exist but are slow and fragile (require full stack: database, Redis, MinIO)
- Critical business logic untested: permission checks, quota validation, token refresh logic, email verification flow
- No apparent mocking strategy for external dependencies

**Impact:**
- **Regression risk** - changes break existing functionality without detection
- **Slow feedback loop** - must run full E2E tests to validate changes
- **Refactoring fear** - developers afraid to improve code due to lack of safety net
- **Production bugs** - complex edge cases not covered by tests
- **Debugging difficulty** - test failures in E2E tests hard to trace to root cause

**Recommendation:**
- Establish unit test coverage target (aim for 70%+ for services)
- Create test helpers for mocking Prisma, MinIO, Redis, Email services
- Add unit tests for all new code via CI enforcement
- Refactor services to support dependency injection of external services
- Use test pyramid: many unit tests, fewer integration tests, minimal E2E tests

---

### 3. **Documentation Debt** (High Risk)
**Technical Details:**
- README files are default NestJS boilerplate, don't explain NOJ-specific functionality
- No API documentation (OpenAPI/Swagger) despite being a REST API
- Complex authentication flows (multi-step token refresh, email verification) lack documentation
- Business logic like permission models, quota systems, and course enrollment undocumented
- No architecture diagrams or system design documentation

**Impact:**
- **High onboarding cost** - new developers spend weeks reading code to understand system
- **Knowledge silos** - only original developers understand complex parts
- **API integration difficulty** - external consumers don't know how to use API
- **Maintenance slowdown** - developers must reverse-engineer code to understand intent
- **Incorrect assumptions** - lack of documentation leads to bugs when assumptions are violated

**Recommendation:**
- Add OpenAPI/Swagger to NestJS API using `@nestjs/swagger` package
- Create architecture documentation (C4 model: Context, Container, Component, Code)
- Document complex business logic in markdown files:
  - Authentication flow diagram
  - Permission model (user roles, course roles, visibility rules)
  - Quota system behavior
  - Course enrollment workflows (invite-only vs token-based vs open)
- Add JSDoc comments to all service methods explaining parameters, return values, and side effects
- Create developer onboarding guide with setup instructions and code tour

---

## High-Impact Improvement Suggestions

### 1. **Implement Repository Pattern for Data Access**

**Current Problem:**
Services directly use Prisma client with inline queries scattered throughout business logic. For example, in `submission.service.ts`:
```typescript
const problem = await this.prisma.problem.findUnique({
  where: { displayId: problemDisplayId },
  select: { id: true, ownerId: true, visibility: true, ... },
});
```
This pattern is repeated 100+ times across services, tightly coupling business logic to database implementation.

**Solution:**
Create repository classes for each entity:
```typescript
// repositories/problem.repository.ts
@Injectable()
export class ProblemRepository {
  constructor(private prisma: PrismaService) {}
  
  async findByDisplayId(displayId: string): Promise<ProblemWithDetails | null> {
    return this.prisma.problem.findUnique({
      where: { displayId },
      include: { owner: true, courses: true },
    });
  }
  
  async findPublicProblems(filters: ProblemFilters): Promise<Problem[]> {
    // Centralized query logic
  }
}
```

**Benefits:**
- **Testability**: Mock repositories instead of entire Prisma client
- **Consistency**: All problem queries go through repository, ensuring consistent data fetching
- **Maintainability**: Database changes isolated to repository layer
- **Performance**: Repository can optimize queries, add caching, implement query builders
- **Reusability**: Common queries (findById, findAll) reused across services

**Effort**: Medium (2-3 weeks) - Create repository for each entity, refactor services to use repositories

---

### 2. **Extract Common Cross-Cutting Concerns into Reusable Utilities**

**Current Problem:**
Permission checking, pagination, filtering, and validation logic is duplicated across services:
- Permission check pattern repeated 20+ times: owner check, admin check, course member check
- Pagination logic copy-pasted with slight variations (page, limit, skip, total)
- Course context resolution duplicated in submission, problem, homework services
- Error building logic repeated with similar structures

**Solution A: Permission Checker Service**
```typescript
@Injectable()
export class PermissionService {
  async canModifyProblem(userId: number, problemId: string): Promise<boolean> {
    const problem = await this.problemRepo.findById(problemId);
    if (!problem) return false;
    if (problem.ownerId === userId) return true;
    if (await this.isAdmin(userId)) return true;
    return false;
  }
  
  async canViewSubmission(userId: number, submissionId: string): Promise<boolean> {
    // Centralized permission logic
  }
}
```

**Solution B: Pagination Helper**
```typescript
export class PaginationHelper {
  static buildPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
  
  static getPaginationParams(page?: number, limit?: number) {
    const normalizedPage = Math.max(1, page || 1);
    const normalizedLimit = Math.min(Math.max(1, limit || 20), 100);
    return {
      skip: (normalizedPage - 1) * normalizedLimit,
      take: normalizedLimit,
    };
  }
}
```

**Solution C: Course Context Resolver**
```typescript
@Injectable()
export class CourseContextService {
  async resolveCourseAccess(
    problemId: string,
    userId: number,
    courseId?: number
  ): Promise<CourseContext | null> {
    // Extracted from multiple services
  }
  
  async validateHomeworkAccess(
    homeworkId: string,
    userId: number
  ): Promise<HomeworkContext> {
    // Centralized homework validation
  }
}
```

**Benefits:**
- **DRY principle**: Eliminate code duplication
- **Consistency**: Same logic applied uniformly across features
- **Testability**: Test permission logic once in utility, not in every service
- **Maintainability**: Permission model changes require updates in one place
- **Readability**: Service methods become cleaner with less boilerplate

**Effort**: Medium (2 weeks) - Extract utilities, refactor services to use them

---

### 3. **Add OpenAPI/Swagger Documentation**

**Current Problem:**
No API documentation exists. Frontend developers, mobile app developers, or third-party integrators must read NestJS controller code to understand API contracts. Parameter requirements, response shapes, error codes, and authentication requirements are not documented.

**Solution:**
Install and configure Swagger:
```bash
pnpm add @nestjs/swagger
```

Configure in `main.ts`:
```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('NOJ Team4 API')
  .setDescription('Online Judge System API')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('auth', 'Authentication & Authorization')
  .addTag('courses', 'Course Management')
  .addTag('problems', 'Problem Management')
  .addTag('submissions', 'Submission & Judging')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Annotate DTOs and Controllers:
```typescript
// auth.controller.ts
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponse })
  @ApiResponse({ status: 400, description: 'Username or email already taken' })
  @ApiResponse({ status: 503, description: 'Registration disabled' })
  async register(@Body() dto: RegisterDto) { ... }
}

// register.dto.ts
export class RegisterDto {
  @ApiProperty({ example: 'john_doe', minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
```

**Benefits:**
- **Self-documenting API**: Documentation generated from code annotations
- **Interactive testing**: Swagger UI allows testing endpoints directly
- **Client generation**: OpenAPI spec enables auto-generating client SDKs
- **Reduced onboarding**: New developers understand API by browsing docs
- **Contract validation**: Swagger validates request/response match spec

**Effort**: Low (1 week) - Install package, annotate existing controllers and DTOs

---

### 4. **Refactor Large Services Using Feature Slicing**

**Current Problem:**
`course.service.ts` (2,474 lines) is a maintenance nightmare. It handles:
- Course CRUD operations (create, read, update, delete, list)
- Member management (add, remove, update roles, list)
- Problem management (add problems, remove problems, list course problems)
- Course invitations (create, accept, decline)
- Course join requests (submit, approve, reject)
- Data exports (CSV generation for members, submissions)
- Exam integration (exam code generation, validation)

This violates Single Responsibility Principle and makes the service difficult to understand, test, and modify.

**Solution:**
Split into focused services using domain-driven design:

```typescript
// course/course.service.ts (core CRUD only)
@Injectable()
export class CourseService {
  async create(dto: CreateCourseDto, userId: number): Promise<Course> { }
  async findById(id: number): Promise<Course | null> { }
  async update(id: number, dto: UpdateCourseDto): Promise<Course> { }
  async delete(id: number): Promise<void> { }
  async list(query: CourseQueryDto): Promise<CoursePage> { }
}

// course/services/course-member.service.ts
@Injectable()
export class CourseMemberService {
  async addMembers(courseId: number, dto: AddMembersDto): Promise<void> { }
  async removeMember(courseId: number, userId: number): Promise<void> { }
  async updateRole(courseId: number, userId: number, role: CourseRole): Promise<void> { }
  async listMembers(courseId: number): Promise<CourseMember[]> { }
  async checkPermission(courseId: number, userId: number): Promise<CourseRole | null> { }
}

// course/services/course-problem.service.ts
@Injectable()
export class CourseProblemService {
  async addProblem(courseId: number, dto: AddProblemDto): Promise<void> { }
  async removeProblem(courseId: number, problemId: string): Promise<void> { }
  async listProblems(courseId: number, query: QueryDto): Promise<ProblemPage> { }
  async cloneProblem(courseId: number, dto: CloneDto): Promise<Problem> { }
}

// course/services/course-invitation.service.ts
@Injectable()
export class CourseInvitationService {
  async createInvitation(courseId: number, dto: CreateDto): Promise<Invitation> { }
  async acceptInvitation(token: string, userId: number): Promise<void> { }
  async declineInvitation(token: string): Promise<void> { }
}

// course/services/course-export.service.ts
@Injectable()
export class CourseExportService {
  async exportMembers(courseId: number): Promise<string> { }
  async exportSubmissions(courseId: number, problemId?: string): Promise<string> { }
}
```

Update original controller to use multiple services:
```typescript
@Controller('courses')
export class CourseController {
  constructor(
    private courseService: CourseService,
    private memberService: CourseMemberService,
    private problemService: CourseProblemService,
    private invitationService: CourseInvitationService,
    private exportService: CourseExportService,
  ) {}
  
  @Get(':id/members')
  async getMembers(@Param('id') id: number) {
    return this.memberService.listMembers(id);
  }
}
```

**Benefits:**
- **Maintainability**: Each service has single, clear responsibility (~200-300 lines each)
- **Testability**: Smaller services easier to unit test with fewer dependencies
- **Readability**: Developers can understand one service without reading 2,474 lines
- **Parallel development**: Multiple developers can work on different services without conflicts
- **Reusability**: `CourseMemberService` can be reused by homework, exam, announcement modules

**Effort**: High (3-4 weeks) - Requires careful extraction to avoid breaking changes

---

### 5. **Implement Centralized Error Handling with Error Codes**

**Current Problem:**
Error handling is inconsistent across the application:
- Some modules use string error codes (`'PROBLEM_NOT_FOUND'`), others use inline messages
- Error localization only implemented in `AuthService`, not in other services
- No standard error response format across endpoints
- Some errors logged with full stack, others not logged at all
- Client-side error handling difficult due to inconsistent error structure

**Solution A: Global Error Response DTO**
```typescript
// common/dto/error-response.dto.ts
export class ErrorResponseDto {
  @ApiProperty({ example: 'PROBLEM_NOT_FOUND' })
  code: string;

  @ApiProperty({ example: 'The requested problem was not found' })
  message: string;

  @ApiProperty({ example: 'en', enum: ['en', 'zh-TW'] })
  locale: string;

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: '2025-12-29T03:21:51.180Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/problems/abc123' })
  path: string;

  @ApiProperty({ required: false })
  details?: Record<string, any>;
}
```

**Solution B: Error Code Registry**
```typescript
// common/errors/error-codes.ts
export const ErrorCodes = {
  // Authentication (1000-1999)
  AUTH_INVALID_CREDENTIALS: { code: 1001, defaultMessage: { en: 'Invalid credentials', 'zh-TW': '帳號或密碼錯誤' } },
  AUTH_EMAIL_NOT_VERIFIED: { code: 1002, defaultMessage: { en: 'Email not verified', 'zh-TW': '信箱尚未驗證' } },
  
  // Problems (2000-2999)
  PROBLEM_NOT_FOUND: { code: 2001, defaultMessage: { en: 'Problem not found', 'zh-TW': '題目不存在' } },
  PROBLEM_ACCESS_DENIED: { code: 2002, defaultMessage: { en: 'Access denied', 'zh-TW': '無權限查看此題目' } },
  
  // Submissions (3000-3999)
  SUBMISSION_QUOTA_EXCEEDED: { code: 3001, defaultMessage: { en: 'Submission quota exceeded', 'zh-TW': '提交次數已達上限' } },
  
  // Courses (4000-4999)
  COURSE_NOT_FOUND: { code: 4001, defaultMessage: { en: 'Course not found', 'zh-TW': '課程不存在' } },
  COURSE_ACCESS_DENIED: { code: 4002, defaultMessage: { en: 'Not a course member', 'zh-TW': '非課程成員' } },
} as const;
```

**Solution C: Localized Exception Classes**
```typescript
// common/exceptions/localized.exception.ts
export class LocalizedException extends HttpException {
  constructor(
    private errorCode: keyof typeof ErrorCodes,
    private locale: 'en' | 'zh-TW' = 'en',
    private details?: Record<string, any>,
  ) {
    const errorDef = ErrorCodes[errorCode];
    const message = errorDef.defaultMessage[locale];
    super({ code: errorCode, message, details }, errorDef.statusCode);
  }
}

// Usage in services
throw new LocalizedException('PROBLEM_NOT_FOUND', locale);
```

**Solution D: Global Exception Filter**
```typescript
// common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const locale = request.headers['x-client-locale'] || 'en';

    let status = 500;
    let errorResponse: ErrorResponseDto;

    if (exception instanceof LocalizedException) {
      status = exception.getStatus();
      errorResponse = {
        code: exception.errorCode,
        message: exception.message,
        locale,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        details: exception.details,
      };
    } else {
      // Handle unexpected errors
      this.logger.error('Unhandled exception', exception);
      errorResponse = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        locale,
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json(errorResponse);
  }
}
```

**Benefits:**
- **Consistent error format**: All API errors follow same structure
- **Localization support**: Error messages automatically translated based on locale
- **Client-friendly**: Frontend can handle errors based on error codes, not message parsing
- **Logging**: Centralized filter ensures all errors logged consistently
- **Documentation**: OpenAPI can document all possible error codes per endpoint
- **Monitoring**: Error codes enable better error tracking and alerting

**Effort**: Medium (2 weeks) - Create error infrastructure, migrate existing code

---

## Implementation Priority

**Phase 1 (Immediate - 1 month):**
1. Add OpenAPI/Swagger documentation (1 week)
2. Extract common utilities (pagination, permissions) (2 weeks)
3. Implement centralized error handling (2 weeks)

**Phase 2 (Short-term - 2 months):**
4. Implement repository pattern (3 weeks)
5. Add unit tests for critical services (4 weeks)
6. Create architecture documentation (1 week)

**Phase 3 (Medium-term - 3 months):**
7. Refactor large services (course, auth, admin) (6 weeks)
8. Increase test coverage to 70% (4 weeks)
9. Implement circuit breakers for external services (2 weeks)

---

## Conclusion

The NOJ Team4 repository demonstrates **solid architectural foundations** with a well-organized monorepo, clean NestJS modular structure, and strong type safety through TypeScript. The codebase achieves **above-average maintainability (3.4/5)** due to consistent naming conventions, proper error handling, and modern technology choices.

However, **three critical risks** threaten long-term maintainability:
1. **God Object services** (especially `course.service.ts` at 2,474 lines) create fragile, hard-to-test code
2. **Minimal unit test coverage** (2 spec files for 474 source files) means regressions will slip through
3. **Documentation debt** leaves new developers without guidance, creating knowledge silos

The **recommended improvements** focus on:
- **Decomposing large services** into focused, single-responsibility components
- **Extracting reusable utilities** to eliminate code duplication
- **Adding comprehensive documentation** through OpenAPI/Swagger and architecture diagrams
- **Implementing repository pattern** to decouple business logic from database
- **Centralizing error handling** for consistent, localized error responses

With these improvements implemented over 3-6 months, the codebase maintainability score could improve from **3.4/5 to 4.5/5**, significantly reducing maintenance costs, onboarding time, and defect rates while improving development velocity and team satisfaction.
