import express, { Request, Response } from "express";
import querystring from "querystring";
import jwt from "jsonwebtoken";
import { get } from "lodash";
import cookieParser from "cookie-parser";
import axios from "axios";
import cors from "cors";
import NodeCache from "node-cache";

const app = express();

app.use(cookieParser());

const GITHUB_CLIENT_ID = "ac13de5979caa668c1f2";
const GITHUB_CLIENT_SECRET = "2491e113c219d08efc6be43ee012b8484b87c98e";
const secret = "shhhhhhhhhhhh";
const COOKIE_NAME = "github-jwt";
const PORT=process.env.PORT ;

app.use(
  cors({
    origin: "https://alhussain-shaikh.github.io/CodeCompass",
    credentials: true,
  })
);

const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: null;
  blog: string;
  location: string;
  email: null;
  hireable: null;
  bio: null;
  twitter_username: null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: Date;
  updated_at: Date;
}

async function getGitHubUser({ code }: { code: string }): Promise<GitHubUser> {
  const cacheKey = `githubUser-${code}`;
  const cachedUser = cache.get<GitHubUser>(cacheKey);

  if (cachedUser) {
    return cachedUser;
  }

  const githubToken = await axios
    .post(
      `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${code}`
    )
    .then((res) => res.data)

    .catch((error) => {
      throw error;
    });

  const decoded = querystring.parse(githubToken);

  const accessToken = decoded.access_token;

  const gitHubUser = await axios
    .get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .then((res) => res.data)
    .catch((error) => {
      console.error(`Error getting user from GitHub`);
      throw error;
    });

  cache.set(cacheKey, gitHubUser);
  return gitHubUser;
}

app.get("/api/auth/github", async (req: Request, res: Response) => {
  const code = get(req, "query.code");
  const path = get(req, "query.path", "/");

  if (!code) {
    throw new Error("No code!");
  }

  const gitHubUser = await getGitHubUser({ code });

  const token = jwt.sign(gitHubUser, secret);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    domain: ".github.io",
  });

  res.redirect(`https://alhussain-shaikh.github.io/CodeCompass${path}`);
});

app.get("/api/me", (req: Request, res: Response) => {
  const cookie = get(req, `cookies[${COOKIE_NAME}]`);

  try {
    const decode = jwt.verify(cookie, secret);

    return res.send(decode);
  } catch (e) {
    return res.send(null);
  }
});

app.listen(PORT, () => {
  console.log("Server is listening");
});
