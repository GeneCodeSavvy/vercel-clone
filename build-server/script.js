import dotenv from "dotenv"
dotenv.config()

import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import mime from "mime-types"
import { createClient } from 'redis'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CLONE_COMMAND = `git clone "${process.env.GIT_REPOSITORY__URL}" /home/app/output/`
const PROJECT_ID = process.env.PROJECT_ID
const REDIS_CLIENT = process.env.REDIS_CLIENT
const BUILD_DIR = process.env.BUILD_DIR || 'dist'
const ROOT_DIR = process.env.ROOT_DIR || '.'
const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build'

let publisher
let s3Client

try {
    publisher = createClient({ url: REDIS_CLIENT })
    await publisher.connect()

    s3Client = new S3Client({ region: 'ap-southeast-2' })
} catch (error) {
    console.error('Failed to initialize clients:', error)
    process.exit(1)
}

const publishLog = async (log) => {
    try {
        await publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }))
    } catch (error) {
        console.error('Failed to publish log:', error)
    }
}

async function init() {
    console.log('Executing script.js')
    publishLog('Build Started...')
    const outDirPath = path.join(__dirname, 'output')
    const rootDirPath = ROOT_DIR ? path.join(outDirPath, ROOT_DIR) : outDirPath

    const p = exec(`${CLONE_COMMAND} && cd ${rootDirPath} && npm install && ${BUILD_COMMAND}`)

    p.stdout.on('data', function(data) {
        console.log(data.toString())
        publishLog(data.toString())
    })

    p.on('error', function(data) {
        console.log('Error', data.toString())
        publishLog(`Error: ${data.toString()}`)
    })

    p.on('close', async function() {
        console.log('Build Complete')
        publishLog(`Build Complete`)

        try {
            const distFolderPath = path.join(rootDirPath, BUILD_DIR)
            const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

            publishLog(`Starting to upload`)
            for (const file of distFolderContents) {
                const filePath = path.join(distFolderPath, file)
                if (fs.lstatSync(filePath).isDirectory()) continue;

                console.log('uploading', filePath)
                publishLog(`uploading ${file}`)

                const command = new PutObjectCommand({
                    Bucket: 'vercel-clone-builder',
                    Key: `__outputs/${PROJECT_ID}/${file}`,
                    Body: fs.createReadStream(filePath),
                    ContentType: mime.lookup(filePath)
                })

                await s3Client.send(command)
                publishLog(`uploaded ${file}`)
                console.log('uploaded', filePath)
            }
            publishLog(`Done`)
            console.log('Done...')
        } catch (error) {
            publishLog(`Error : ${error}`)
        }

        try {
            await publisher.quit();
        } catch (error) {
            console.error('Error closing Redis client:', error);
        }

    })

    publisher.on("error", (e) => {
        console.log(e);
    })
}

init()
