import React, { useState } from 'react';
import axios from 'axios';
import './issueRecommendation.css';
import { useSelector } from 'react-redux';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

function GitHubIssueFetcher() {
  const [issueTypes, setIssueTypes] = useState('');
  const [numIssues, setNumIssues] = useState(0);
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const githubToken = useSelector((state) => state.github.github_token);

  const fetchGitHubIssues = async () => {
    try {
      setLoading(true);

      const labels = issueTypes.split(',').map(issueType => `label:${issueType.trim()}`).join('+');
      const apiUrl = `https://api.github.com/search/issues?q=state:open+is:issue+${labels}`;
      const headers = {
        Authorization: `token ${githubToken}`,
      };

      const cacheKey = `${labels}-${numIssues}`;
      const cachedIssues = cache.get(cacheKey);

      if (cachedIssues) {
        setResult(cachedIssues);
        setLoading(false);
        return;
      }

      const response = await axios.get(apiUrl, { headers });
      const data = response.data;

      if ('items' in data) {
        const issues = data.items.slice(0, numIssues).map((item, index) => {
          const ownerName = item.repository_url.split('/')[4];
          const repoName = item.repository_url.split('/')[5];

          return (
            <div key={index} className='issueOutput'>
              <div className='cardHeader'>
                <img className='profilePic' src={item.user.avatar_url} alt="" />
                <a className='RepositoryURL' href={item.html_url} target='_blank' rel='noopener noreferrer'>Repo: {repoName}</a>
                <span className='owner'>Owner: {ownerName}</span>
              </div>
              <div className='issueDescription'>
                <p className='title'><b>Title: </b>{item.title}</p>
                <p>{item.body}</p>
              </div>
            </div>
          );
        });

        setResult(issues);
        cache.set(cacheKey, issues);
      } else {
        setResult(['No issues found for the given type.']);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>Tag Based Issue Recommendation</h1>
      <div className='inputLabel'>
        Enter the types of issues you want to work on (e.g., bug, enhancement):
        <input
          type="text"
          value={issueTypes}
          onChange={(e) => setIssueTypes(e.target.value)}
        />
      </div>
      <div className='numberOfIssues'>
        Enter the number of issues you want to see:
        <input
          type="number"
          value={numIssues}
          onChange={(e) => setNumIssues(e.target.value)}
        />
      </div>
      <button className='fetch' onClick={fetchGitHubIssues}>Fetch Issues</button>
      {loading ? <p className="loading">Loading...</p> : <div className='outputContainer'>{result}</div>}
    </div>
  );
}

export default GitHubIssueFetcher;
