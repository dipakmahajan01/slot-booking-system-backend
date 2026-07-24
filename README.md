<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database (Postgres)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=root
DB_NAME=slot_booking

# Auth
JWT_SECRET=224e581e4b9d830ec396b46ac5f1f2303ede1b1d5a87dcdb66b47e50264c5d69
JWT_EXPIRES_IN=1d
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Reference

Base URL: `http://localhost:3000`

All protected routes require an `Authorization: Bearer <TOKEN>` header, where `<TOKEN>` is the `accessToken` returned by `/auth/login`.

### Auth

**Register**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123",
    "roleName": "Owner"
  }'
```

**Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Services

**Create service** — Owner only

```bash
curl -X POST http://localhost:3000/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "Haircut",
    "duration": 30,
    "price": 25
  }'
```

**Get my services** — Owner only

```bash
curl -X GET http://localhost:3000/services/my \
  -H "Authorization: Bearer <TOKEN>"
```

**Browse all services** — Customer only

```bash
curl -X GET http://localhost:3000/services/browse \
  -H "Authorization: Bearer <TOKEN>"
```

**Get service by ID**

```bash
curl -X GET http://localhost:3000/services/<SERVICE_ID>
```

**Update service** — Owner only

```bash
curl -X PATCH http://localhost:3000/services/<SERVICE_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "price": 30
  }'
```

**Delete service** — Owner only

```bash
curl -X DELETE http://localhost:3000/services/<SERVICE_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

### Availability

**Create availability slot** — Owner only

```bash
curl -X POST http://localhost:3000/availability \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "17:00"
  }'
```

**Get my availability slots** — Owner only

```bash
curl -X GET http://localhost:3000/availability \
  -H "Authorization: Bearer <TOKEN>"
```

**Get availability slot by ID**

```bash
curl -X GET http://localhost:3000/availability/<AVAILABILITY_ID>
```

**Update availability slot** — Owner only

```bash
curl -X PATCH http://localhost:3000/availability/<AVAILABILITY_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "endTime": "18:00"
  }'
```

**Delete availability slot** — Owner only

```bash
curl -X DELETE http://localhost:3000/availability/<AVAILABILITY_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

### Bookings

**Create booking** — Customer only

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "serviceId": "<SERVICE_ID>",
    "slotStartTime": "2026-07-27T09:00:00.000Z",
    "slotEndTime": "2026-07-27T09:30:00.000Z"
  }'
```

**Get bookings** — any authenticated user (owners see bookings on their services, customers see their own)

```bash
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer <TOKEN>"
```

**Get booking by ID**

```bash
curl -X GET http://localhost:3000/bookings/<BOOKING_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

**Update booking status**

```bash
curl -X PATCH http://localhost:3000/bookings/<BOOKING_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "status": "CANCELLED"
  }'
```

> Note: The `users` and `roles` controllers exist in the codebase but are unimplemented CLI-generated stubs (not wired to the database), so they are omitted here.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
