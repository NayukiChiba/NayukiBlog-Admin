import { Octokit } from "@octokit/rest";

// 配置（必须通过环境变量设置）
const REPO_OWNER = import.meta.env.VITE_GITHUB_OWNER || "";
const REPO_NAME = import.meta.env.VITE_GITHUB_REPO || "";
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH || "main";

// 文件路径常量
const PATHS = {
  articles: "src/content/blog",
  diaries: "src/data/diaries.json",
  projects: "src/data/projects.json",
  books: "src/data/books.json",
  gallery: "src/data/gallery.json",
  todos: "src/data/todos.json",
  tools: "src/data/tools.json",
};

// 类型定义
export interface Article {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  description: string;
  image: string;
  status: "public" | "draft" | "private";
  content: string;
  sha?: string;
  folder?: string; // 文章所在的子文件夹路径（相对于 blog 目录）
}

export interface Diary {
  id: number;
  date: string;
  content: string;
  mood: string;
  weather: string;
  images: string[];
}

export interface Project {
  id: number;
  name: string;
  description: string;
  link: string;
  techStack: string[];
  status: "completed" | "in-progress" | "planned";
  visibility: string;
}

export interface Book {
  id: number;
  title: string;
  cover: string;
  url: string;
  status: string;
  tags: string[];
}

export interface GalleryItem {
  id: number;
  title: string;
  url: string;
  date: string;
  tags: string[];
  status: string;
}

export interface Todo {
  id: number;
  task: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  type: "short-term" | "mid-term" | "long-term";
  progress: number;
  icon: string;
  status: string;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
  status: string;
}

// GitHub API 类
class GitHubAPI {
  private octokit: Octokit | null = null;
  private owner = REPO_OWNER;
  private repo = REPO_NAME;
  private branch = BRANCH;

  // 初始化 Octokit
  init(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  // 检查是否已初始化
  private checkInit() {
    if (!this.octokit) {
      throw new Error("GitHub API 未初始化，请先登录");
    }
  }

  // 获取文件内容
  async getFileContent(
    path: string,
  ): Promise<{ content: string; sha: string }> {
    this.checkInit();

    try {
      const response = await this.octokit!.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (
        "content" in response.data &&
        typeof response.data.content === "string"
      ) {
        // 正确的 UTF-8 解码方式
        const base64 = response.data.content.replace(/\n/g, '');
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const content = new TextDecoder('utf-8').decode(bytes);
        
        return {
          content,
          sha: response.data.sha,
        };
      }

      throw new Error("无法获取文件内容");
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error("文件不存在");
      }
      throw error;
    }
  }

  // 创建或更新文件
  async saveFile(
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<string> {
    this.checkInit();

    // 正确的 UTF-8 编码方式
    const utf8Bytes = new TextEncoder().encode(content);
    const base64 = btoa(String.fromCharCode(...utf8Bytes));

    const response = await this.octokit!.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: base64,
      branch: this.branch,
      ...(sha && { sha }),
    });

    return response.data.content?.sha || "";
  }

  // 删除文件
  async deleteFile(path: string, message: string, sha: string): Promise<void> {
    this.checkInit();

    await this.octokit!.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      sha,
      branch: this.branch,
    });
  }

  // 列出目录下的文件（支持递归获取子文件夹）
  async listFiles(
    path: string,
    recursive = false,
    excludeUnderscoreFolders = true, // 排除 _ 开头的文件夹
  ): Promise<Array<{ name: string; path: string; sha: string; type: "dir" | "file" | "submodule" | "symlink" }>> {
    this.checkInit();

    const response = await this.octokit!.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.branch,
    });

    if (Array.isArray(response.data)) {
      const items = response.data.map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        type: item.type as "dir" | "file" | "submodule" | "symlink",
      }));

      if (recursive) {
        // 递归获取子文件夹中的文件
        const directories = items.filter((item) => {
          if (item.type !== "dir") return false;
          // 排除 _ 开头的文件夹
          if (excludeUnderscoreFolders && item.name.startsWith("_")) return false;
          return true;
        });
        const files = items.filter((item) => item.type === "file");

        for (const dir of directories) {
          const subFiles = await this.listFiles(dir.path, true, excludeUnderscoreFolders);
          files.push(...subFiles);
        }

        return files;
      }

      return items;
    }

    return [];
  }

  // ==================== 文章管理 ====================

  // 获取所有文章（包括子文件夹）
  async getArticles(): Promise<Article[]> {
    const files = await this.listFiles(PATHS.articles, true); // 递归获取
    const articles: Article[] = [];

    for (const file of files) {
      if (file.name.endsWith(".md")) {
        try {
          const { content, sha } = await this.getFileContent(file.path);
          // 计算相对于 blog 目录的文件夹路径
          const relativePath = file.path.replace(PATHS.articles + "/", "");
          const folderPath = relativePath.includes("/")
            ? relativePath.substring(0, relativePath.lastIndexOf("/"))
            : "";
          const article = this.parseMarkdown(content, file.name, sha, folderPath);
          articles.push(article);
        } catch (error) {
          console.error(`Failed to parse article: ${file.name}`, error);
        }
      }
    }

    // 按日期排序
    return articles.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // 获取单篇文章（slug 可以包含文件夹路径，如 "folder/subfolder/article-name"）
  async getArticle(slug: string): Promise<Article | null> {
    const path = `${PATHS.articles}/${slug}.md`;

    try {
      const { content, sha } = await this.getFileContent(path);
      // 提取文件夹路径
      const folderPath = slug.includes("/")
        ? slug.substring(0, slug.lastIndexOf("/"))
        : "";
      const filename = slug.includes("/")
        ? slug.substring(slug.lastIndexOf("/") + 1) + ".md"
        : `${slug}.md`;
      return this.parseMarkdown(content, filename, sha, folderPath);
    } catch (error) {
      return null;
    }
  }

  // 保存文章（支持子文件夹）
  async saveArticle(article: Article, isNew = false): Promise<void> {
    const filename = article.slug || this.generateSlug(article.title);
    // 如果有 folder 属性，则保存到对应的子文件夹
    const folderPrefix = article.folder ? `${article.folder}/` : "";
    const path = `${PATHS.articles}/${folderPrefix}${filename}.md`;
    const content = this.generateMarkdown(article);
    const message = isNew
      ? `📝 新建文章: ${article.title}`
      : `✏️ 更新文章: ${article.title}`;

    await this.saveFile(
      path,
      content,
      message,
      isNew ? undefined : article.sha,
    );
  }

  // 删除文章（slug 可以包含文件夹路径，如 "folder/subfolder/article-name"）
  async deleteArticle(slug: string, sha: string): Promise<void> {
    const path = `${PATHS.articles}/${slug}.md`;
    const displayName = slug.includes("/")
      ? slug.substring(slug.lastIndexOf("/") + 1)
      : slug;
    await this.deleteFile(path, `🗑️ 删除文章: ${displayName}`, sha);
  }

  // 解析 Markdown 文件
  private parseMarkdown(
    content: string,
    filename: string,
    sha: string,
    folder = "",
  ): Article {
    const baseSlug = filename.replace(".md", "");
    // slug 包含完整路径（用于 getArticle 和 deleteArticle）
    const slug = folder ? `${folder}/${baseSlug}` : baseSlug;
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      return {
        slug,
        title: baseSlug,
        date: new Date().toISOString().split("T")[0],
        category: "",
        tags: [],
        description: "",
        image: "",
        status: "draft",
        content: content,
        sha,
        folder,
      };
    }

    const frontmatter = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length).trim();

    // 解析 frontmatter
    const getValue = (key: string): string => {
      const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
      return match ? match[1].trim() : "";
    };

    const getArrayValue = (key: string): string[] => {
      const match = frontmatter.match(
        new RegExp(`^${key}:\\s*\\[(.*)\\]$`, "m"),
      );
      if (match) {
        return match[1]
          .split(",")
          .map((s) => s.trim().replace(/['"]/g, ""))
          .filter(Boolean);
      }
      return [];
    };

    return {
      slug,
      title: getValue("title"),
      date: getValue("date"),
      category: getValue("category"),
      tags: getArrayValue("tags"),
      description: getValue("description"),
      image: getValue("image"),
      status: (getValue("status") as Article["status"]) || "public",
      content: body,
      sha,
      folder,
    };
  }

  // 生成 Markdown 文件
  private generateMarkdown(article: Article): string {
    const frontmatter = `---
title: ${article.title}
date: ${article.date}
category: ${article.category}
tags: [${article.tags.join(", ")}]
description: ${article.description}
image: ${article.image}
status: ${article.status}
---`;

    return `${frontmatter}\n\n${article.content}`;
  }

  // 生成 slug
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "");
  }

  // ==================== JSON 数据管理 ====================

  // 获取 JSON 数据
  private async getJsonData<T>(
    path: string,
  ): Promise<{ data: T; sha: string }> {
    const { content, sha } = await this.getFileContent(path);
    return {
      data: JSON.parse(content),
      sha,
    };
  }

  // 保存 JSON 数据
  private async saveJsonData<T>(
    path: string,
    data: T,
    message: string,
    sha: string,
  ): Promise<string> {
    const content = JSON.stringify(data, null, 2);
    return await this.saveFile(path, content, message, sha);
  }

  // ==================== 日记管理 ====================

  async getDiaries(): Promise<{ diaries: Diary[]; sha: string }> {
    const { data, sha } = await this.getJsonData<{ diaries: Diary[] }>(
      PATHS.diaries,
    );
    return { diaries: data.diaries || [], sha };
  }

  async saveDiaries(
    diaries: Diary[],
    sha: string,
    message = "📔 更新日记",
  ): Promise<string> {
    return await this.saveJsonData(PATHS.diaries, { diaries }, message, sha);
  }

  // ==================== 项目管理 ====================

  async getProjects(): Promise<{ projects: Project[]; sha: string }> {
    const { data, sha } = await this.getJsonData<{ projects: Project[] }>(
      PATHS.projects,
    );
    return { projects: data.projects || [], sha };
  }

  async saveProjects(
    projects: Project[],
    sha: string,
    message = "📁 更新项目",
  ): Promise<string> {
    return await this.saveJsonData(PATHS.projects, { projects }, message, sha);
  }

  // ==================== 书籍管理 ====================

  async getBooks(): Promise<{ books: Book[]; sha: string }> {
    const { data, sha } = await this.getJsonData<{ books: Book[] }>(
      PATHS.books,
    );
    return { books: data.books || [], sha };
  }

  async saveBooks(
    books: Book[],
    sha: string,
    message = "📚 更新书籍",
  ): Promise<string> {
    return await this.saveJsonData(PATHS.books, { books }, message, sha);
  }

  // ==================== 图库管理 ====================

  async getGallery(): Promise<{ gallery: GalleryItem[]; sha: string }> {
    const { data, sha } = await this.getJsonData<{ gallery: GalleryItem[] }>(
      PATHS.gallery,
    );
    return { gallery: data.gallery || [], sha };
  }

  async saveGallery(
    gallery: GalleryItem[],
    sha: string,
    message = "🖼️ 更新图库",
  ): Promise<string> {
    return await this.saveJsonData(PATHS.gallery, { gallery }, message, sha);
  }

  // ==================== 待办管理 ====================

  async getTodos(): Promise<{ todos: Todo[]; sha: string }> {
    const { data, sha } = await this.getJsonData<{ todos: Todo[] }>(
      PATHS.todos,
    );
    return { todos: data.todos || [], sha };
  }

  async saveTodos(
    todos: Todo[],
    sha: string,
    message = "✅ 更新待办",
  ): Promise<string> {
    return await this.saveJsonData(PATHS.todos, { todos }, message, sha);
  }

  // ==================== 工具管理 ====================

  async getTools(): Promise<{ tools: Tool[]; sha: string }> {
    const { data, sha } = await this.getJsonData<{ tools: Tool[] }>(
      PATHS.tools,
    );
    return { tools: data.tools || [], sha };
  }

  async saveTools(
    tools: Tool[],
    sha: string,
    message = "🔧 更新工具",
  ): Promise<string> {
    return await this.saveJsonData(PATHS.tools, { tools }, message, sha);
  }

  // ==================== 统计信息 ====================

  async getStats(): Promise<{
    articles: number;
    diaries: number;
    projects: number;
    books: number;
    gallery: number;
    todos: number;
  }> {
    try {
      const [articles, diaries, projects, books, gallery, todos] =
        await Promise.all([
          this.listFiles(PATHS.articles, true).then(
            (files) => files.filter((f) => f.name.endsWith(".md")).length,
          ),
          this.getDiaries().then((r) => r.diaries.length),
          this.getProjects().then((r) => r.projects.length),
          this.getBooks().then((r) => r.books.length),
          this.getGallery().then((r) => r.gallery.length),
          this.getTodos().then((r) => r.todos.length),
        ]);

      return { articles, diaries, projects, books, gallery, todos };
    } catch (error) {
      console.error("Failed to get stats:", error);
      return {
        articles: 0,
        diaries: 0,
        projects: 0,
        books: 0,
        gallery: 0,
        todos: 0,
      };
    }
  }
}

// 导出单例
export const githubAPI = new GitHubAPI();

export default githubAPI;
