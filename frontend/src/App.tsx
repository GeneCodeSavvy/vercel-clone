import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [gitUrl, setGitUrl] = useState('');
    const [buildDir, setBuildDir] = useState('');
    const [rootDir, setRootDir] = useState('');
    const [buildCommand, setBuildCommand] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [projectUrl, setProjectURL] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);

    const logsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const socket = new WebSocket('wss://api.vercel.harsh-dev.xyz');
        socket.onopen = () => {
            console.log('WebSocket established');
        };
        socket.onmessage = (event) => {
            const message = typeof event.data === 'string' ? event.data : '';
            if (message) {
                setLogs(prev => [...prev, JSON.parse(message)["log"]]);
            }
        };
        socket.onerror = (err) => {
            setStatus(`WebSocket error: ${err}`);
            console.error('WebSocket error:', err);
        };
        socket.onclose = () => {
            setStatus('WebSocket disconnected');
            setWs(null);
        };
        setWs(socket);
        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
        if (logs[logs.length - 1] === 'Done') {
            setStatus('The project is hosted');
        }
    }, [logs]);

    useEffect(() => {
        if (status === 'The project is hosted' || status.startsWith('Error')) {
            setIsLoading(false);
        }
    }, [status]);


    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            setCopySuccess('Failed to copy');
            setTimeout(() => setCopySuccess(''), 2000);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!gitUrl.trim()) return;

        setIsLoading(true);
        setStatus('Creating project...');
        setLogs([]);
        setProjectURL('');

        let repositoryUrl = gitUrl.trim();
        if (!repositoryUrl.startsWith('http') && !repositoryUrl.includes('/')) {
            repositoryUrl = `https://github.com/${repositoryUrl}/${repositoryUrl}.github.io`;
        } else if (!repositoryUrl.startsWith('http')) {
            repositoryUrl = `https://github.com/${repositoryUrl}`;
        }

        try {
            const response = await axios.post(`https://api.vercel.harsh-dev.xyz/project`, {
                gitURL: repositoryUrl,
                buildDir: buildDir,
                rootDir: rootDir,
                buildCommand: buildCommand
            });

            if (response.data.status === 'queued') {
                setStatus('Project queued! Provisioning Compute to Build...');
                setProjectURL(response.data.url);
                const newChannel = response.data.wss_channel;

                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(newChannel);
                } else if (ws) {
                    ws.addEventListener('open', () => ws.send(newChannel), { once: true });
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
                setStatus('Error: Quota Completed of 10 Projects')
            } else {
                console.error('Error creating project:', error);
                setStatus('Error creating project. Please try again.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="app">
            <div className="header">
                <h1 style={{ color: 'white', fontSize: '25px' }}>VerceLESS by <a style={{ textDecoration: 'none' }} href="https://x.com/intent/follow?screen_name=harsh_twtt" target='_blank' rel='noopener'>@harsh_twtt</a></h1>
            </div>

            <div className="main-container">

                <div className='form-content-container'>

                    <div className="form-container">

                        <h2 id="github-form-heading">Enter your GitHub repository details</h2>
                        <form onSubmit={handleSubmit} className="form" >
                            <div className='input-container'>
                                <label htmlFor="git-url">Github Public Repo</label>
                                <input
                                    id='git-url'
                                    type="text"
                                    value={gitUrl}
                                    onChange={(e) => setGitUrl(e.target.value)}
                                    placeholder="Enter git URL"
                                    className="input"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className='input-container'>
                                <label htmlFor="frontend-inp">Frontend Directory</label>
                                <input
                                    id='frontend-inp'
                                    type="text"
                                    value={rootDir}
                                    onChange={(e) => setRootDir(e.target.value)}
                                    placeholder="Optional, defaults to project root"
                                    className="input"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className='input-container'>
                                <label htmlFor="build-dir">Build Directory </label>
                                <input
                                    id="build-dir"
                                    type="text"
                                    value={buildDir}
                                    onChange={(e) => setBuildDir(e.target.value)}
                                    placeholder="Optional, defaults to 'dist'"
                                    className="input"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className='input-container'>
                                <label htmlFor="build-cmd">Build command</label>
                                <input
                                    id="build-cmd"
                                    type="text"
                                    value={buildCommand}
                                    onChange={(e) => setBuildCommand(e.target.value)}
                                    placeholder="Optional, defaults to 'npm run dev'"
                                    className="input"
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                type="submit"
                                className="submit-button"
                                disabled={isLoading || !gitUrl.trim()}
                            >
                                {isLoading ? (
                                    <div className="loader-container">
                                        <div className="loader"></div>
                                    </div>
                                ) : (
                                    'Deploy →'
                                )}
                            </button>
                        </form>
                    </div>

                    <h4 className='status'>{status}</h4>

                    <div className="url-container">
                        <div className="url-display">
                            <div className="url-output-group">
                                <input
                                    type="text"
                                    value={status === "The project is hosted" ? projectUrl : ''}
                                    readOnly
                                    className="url-output"
                                />
                                <div className='url-output-buttons'>
                                    <button
                                        onClick={() => copyToClipboard(projectUrl)}
                                        className="copy-button"
                                        type='button'
                                    >
                                        {copySuccess || 'Copy'}
                                    </button>
                                    <button
                                        onClick={() => window.open(projectUrl, '_blank', 'noopener,noreferrer')}
                                        className="visit-button"
                                        type='button'
                                    >
                                        Visit
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="logs-container" >
                    <h3>Live build logs</h3>
                    <div
                        ref={logsRef}
                    >
                        {logs.map((log, index) => (
                            <p className='logs' key={`${log}-${index}`} >{log}</p>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    )
}

export default App;
