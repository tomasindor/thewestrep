# Customer Authentication Specification

## Purpose

Defines behavioral requirements for public customer authentication in the ecommerce flow: registration, login, email verification, guest checkout coexistence, contextual redirects, password recovery, progressive profiling, admin/customer separation, and security/privacy boundaries. Google OAuth is explicitly deferred.

## Requirements

### Requirement: Customer Registration

The system SHALL allow new customers to create an account with minimal fields: name, email, and password. Registration MUST require explicit acknowledgement of privacy terms and data processing consent. The system MUST NOT collect phone, address, city, province, or postal code during initial registration.

#### Scenario: Successful registration with consent

- GIVEN a visitor provides a unique email, valid password, name, and consents to privacy terms
- WHEN they submit the registration form
- THEN an account is created in unverified state, a verification email is sent, and the user is redirected to a verification-pending page

#### Scenario: Registration without consent

- GIVEN a visitor fills name, email, and password but does not acknowledge privacy terms
- WHEN they attempt to submit
- THEN the submission is rejected with a clear message requiring consent

#### Scenario: Duplicate email registration

- GIVEN an email already associated with an existing account
- WHEN a visitor attempts to register with that email
- THEN a generic message is shown that does not reveal whether the email exists

#### Scenario: Password strength validation

- GIVEN a visitor provides a password shorter than 8 characters or lacking required character classes
- WHEN they attempt to register
- THEN the form rejects the input with a human-readable strength requirement message

### Requirement: Customer Login

The system SHALL authenticate returning customers via email and password credentials. Login MUST enforce rate limiting and return simple error messages that do not enable account enumeration.

#### Scenario: Successful login

- GIVEN a verified customer provides correct email and password
- WHEN they submit the login form
- THEN they are authenticated and redirected to their previous context or default homepage

#### Scenario: Failed login with wrong credentials

- GIVEN a customer provides an incorrect email or password
- WHEN they submit the login form
- THEN a generic credential error is shown without indicating which field is wrong

#### Scenario: Login attempt for unverified account

- GIVEN a customer with an unverified account provides correct credentials
- WHEN they submit the login form
- THEN they are authenticated into a restricted session and prompted to verify their email before purchasing

#### Scenario: Brute force protection

- GIVEN repeated failed login attempts from the same source
- WHEN the rate limit threshold is reached
- THEN further attempts are blocked with a clear cooldown message

### Requirement: Email Verification Gating

The system SHALL require email verification before a registered customer can complete checkout. Guest checkout MUST remain unaffected by this requirement.

#### Scenario: Unverified customer blocked at checkout

- GIVEN a logged-in customer whose email has not been verified
- WHEN they attempt to complete a purchase in account mode
- THEN the checkout is blocked with a prompt to verify their email, and a resend option is offered

#### Scenario: Verified customer proceeds to checkout

- GIVEN a logged-in customer whose email has been verified
- WHEN they attempt to complete a purchase
- THEN checkout proceeds normally

#### Scenario: Guest checkout bypasses verification

- GIVEN a visitor chooses to continue as guest at checkout
- WHEN they complete the purchase
- THEN no email verification is required and the order is processed

#### Scenario: Verification link activation

- GIVEN a customer clicks a valid, unexpired verification link from their email
- WHEN the link is processed
- THEN their account is marked as verified and they are redirected to login or their prior context

#### Scenario: Expired or invalid verification link

- GIVEN a customer clicks an expired or tampered verification link
- WHEN the link is processed
- THEN an error is shown with an option to request a new verification email

### Requirement: Guest Checkout Preservation

The system SHALL always offer a continue-as-guest option at checkout. Guest checkout MUST NOT require registration, login, or email verification. Any redirect from checkout to login MUST prominently surface the guest option.

#### Scenario: Checkout access gate offers guest path

- GIVEN an unauthenticated user reaches the checkout access gate
- WHEN the gate is displayed
- THEN it offers login, register, and a prominent continue-as-guest option

#### Scenario: Guest checkout completes without account

- GIVEN a user selects continue-as-guest
- WHEN they provide shipping details and payment
- THEN the order is completed without creating or requiring an account

### Requirement: Contextual Redirects

The system SHALL preserve the user's prior page context when redirecting to login or registration, and return them to that context after successful authentication.

#### Scenario: Redirect to login from checkout

- GIVEN a user at checkout who needs to log in
- WHEN they are redirected to the login page
- THEN the login URL includes a return-to parameter encoding the checkout context

#### Scenario: Post-login return to prior context

- GIVEN a user logs in after being redirected from a product page
- WHEN authentication succeeds
- THEN they are returned to that product page, not a default homepage

#### Scenario: Post-registration return to prior context

- GIVEN a user registers after being redirected from checkout
- WHEN registration succeeds and email is sent
- THEN they are directed to a verification page that acknowledges their original checkout intent

#### Scenario: No prior context defaults to homepage

- GIVEN a user navigates directly to login with no referrer or return parameter
- WHEN authentication succeeds
- THEN they are redirected to the default homepage

### Requirement: Forgot and Reset Password

The system SHALL allow customers to request a password reset via email and set a new password using a time-limited token. All messages MUST be enumeration-safe.

#### Scenario: Forgot password request

- GIVEN a customer enters their email on the forgot-password form
- WHEN they submit the request
- THEN a generic confirmation is shown regardless of whether the email exists, and a reset email is sent only if the account exists

#### Scenario: Password reset with valid token

- GIVEN a customer follows a valid, unexpired reset link
- WHEN they provide a new password meeting strength requirements
- THEN the password is updated and they are redirected to login

#### Scenario: Expired reset token

- GIVEN a customer follows an expired reset link
- WHEN they attempt to use it
- THEN an error is shown with an option to request a new reset email

### Requirement: Progressive Customer Profile

The system SHALL allow customers to complete their profile with additional data (phone, address, city, province, postal code) after initial registration. Checkout MAY collect and persist this data for future purchases, but initial registration SHALL NOT require it.

#### Scenario: Registration without profile data

- GIVEN a new customer registers with only name, email, and password
- WHEN their account is created
- THEN profile fields for phone and address remain empty and optional

#### Scenario: Profile completion after registration

- GIVEN a logged-in customer visits their profile page
- WHEN they add phone and address information
- THEN the data is saved and available for future checkout prefill

### Requirement: Admin and Customer Separation

The system SHALL maintain completely isolated authentication boundaries for admin and customer roles. Admin login MUST remain exclusively under `/admin`. Customer auth MUST NOT share session configuration, cookies, or handlers with admin auth.

#### Scenario: Admin login isolated from customer flow

- GIVEN a user accesses `/admin`
- WHEN they authenticate
- THEN only admin credentials are accepted, and customer accounts cannot log in

#### Scenario: Customer cannot access admin

- GIVEN a logged-in customer attempts to access `/admin`
- WHEN the request is processed
- THEN access is denied regardless of their customer session state

#### Scenario: Separate session cookies

- GIVEN both admin and customer sessions exist simultaneously
- WHEN cookies are inspected
- THEN admin and customer sessions use distinct cookie names and cannot be interchanged

### Requirement: Security and Privacy Boundaries

The system SHALL protect against brute force attacks, account enumeration, and session replay. All error messages MUST be human-readable without exposing internal details. Personal data handling MUST require explicit consent.

#### Scenario: Rate limiting across serverless instances

- GIVEN login or registration attempts exceed the configured threshold
- WHEN the rate limiter evaluates the request
- THEN the request is blocked based on persistent state, not in-memory data

#### Scenario: No account enumeration via timing

- GIVEN an attacker measures response times for existing vs non-existing emails
- WHEN they compare login or registration responses
- THEN response times are indistinguishable between the two cases

#### Scenario: Session revocation on password change

- GIVEN a customer changes their password
- WHEN the change is confirmed
- THEN existing sessions are invalidated, requiring re-authentication

#### Scenario: Privacy consent recorded

- GIVEN a customer completes registration with consent
- WHEN the account is created
- THEN the consent timestamp and version are stored with the account record

### Requirement: Google OAuth Deferred

The system SHALL NOT include Google OAuth or any social login in the initial customer authentication flow. The Google provider configuration, if present, MUST be disabled or removed from the active customer auth path.

#### Scenario: Google OAuth not available

- GIVEN a customer visits the login or registration page
- WHEN the page is rendered
- THEN no Google or social login button is displayed

#### Scenario: Google provider disabled in configuration

- GIVEN the auth configuration is evaluated
- WHEN customer auth providers are loaded
- THEN the Google provider is absent or explicitly disabled
