## Intro

seemed like a good side project, so here goes....

## Architecture
### API Server
- the user will hit this server.
- it will run the build task in a aws fargate instance
### Build Server
- an amazon ec2 instance that spins up docker container on demand.
- docker file
### frontend
- simple interface to give the url, and upload the env file.
### s3-reverse-proxy
- takes the browser requests, and serves the files from the s3 bucket.

## Tech learnt
- hosting backend, and redis with tls on servers
- tls automation for dynamic links via caddy
- aws stack : ecr, ecs, s3
- vpc, subnets, security groups and route table setup
- Github CI/CD

## Result
- Host your react frontend on [Verceless](vercel.harsh-dev.xyz)
- Get live build logs
- Get HTTPS link
