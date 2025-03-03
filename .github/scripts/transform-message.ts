import { components } from "npm:@octokit/openapi-types";
import { stdin } from "npm:zx";

type GitHubSchema = components["schemas"];

interface GitHubAction
  extends Record<"event_name" | "actor" | "server_url" | "repository", string> {
  action?: string;
  ref?: string;
  ref_name?: string;
  event: {
    head_commit?: GitHubSchema["git-commit"];
    issue?: GitHubSchema["webhook-issues-opened"]["issue"];
    pull_request?: GitHubSchema["pull-request"];
    discussion?: GitHubSchema["discussion"];
    comment?: GitHubSchema["issue-comment"];
    release?: GitHubSchema["release"];
  };
}

// Helper functions
const getActionText = (action?: string) =>
  action === "closed" ? "关闭" : action?.includes("open") ? "打开" : "编辑";

const createLink = (href: string, text = href) => ({ tag: "a", href, text });

const createText = (text: string) => ({ tag: "text", text });

// 新增辅助函数
const createUserLink = (user?: { login: string; html_url: string }) => 
  user ? createLink(user.login, user.html_url) : createText("无");

const createContentItem = (label: string, value?: string | { tag: string; text: string }) => [
  createText(label),
  typeof value === 'string' ? createText(value || "无") : value || createText("无")
];

type EventHandler = (
  event: GitHubAction,
  actionText: string
) => {
  title: string;
  content: [any, any][];
};

// Event handlers
const eventHandlers: Record<string, EventHandler> = {
  push: ({
    event: { head_commit },
    ref,
    ref_name,
    server_url,
    repository,
    actor,
  }) => ({
    title: "GitHub 代码提交",
    content: [
      [
        createText("提交链接："),
        createLink(head_commit?.url || "", head_commit?.url || ""),
      ],
      [
        createText("代码分支："),
        createLink(ref || "", `${server_url}/${repository}/tree/${ref_name}`),
      ],
      [createText("提交作者："), createLink(actor, `${server_url}/${actor}`)],
      [createText("提交信息："), createText(head_commit?.message || "")],
    ],
  }),

  issues: ({ event: { issue } }, actionText) => ({
    title: `GitHub issue ${actionText}：${issue?.title}`,
    content: [
      [createText("链接："), createLink(issue?.html_url, issue?.html_url)],
      [
        createText("作者："),
        createLink(issue?.user?.login, issue?.user?.html_url),
      ],
      [
        createText("指派："),
        issue?.assignee
          ? createLink(issue.assignee.login, issue.assignee.html_url)
          : createText("无"),
      ],
      [
        createText("标签："),
        createText(issue?.labels?.map(({ name }) => name).join(", ") || "无"),
      ],
      [createText("里程碑："), createText(issue?.milestone?.title || "无")],
      [createText("描述："), createText(issue?.body || "无描述")],
    ],
  }),

  pull_request: ({ event: { pull_request } }, actionText) => ({
    title: `GitHub PR ${actionText}：${pull_request?.title}`,
    content: [
      [
        createText("链接："),
        createLink(pull_request?.html_url, pull_request?.html_url),
      ],
      [
        createText("作者："),
        createLink(pull_request?.user.login, pull_request?.user.html_url),
      ],
      [
        createText("指派："),
        pull_request?.assignee
          ? createLink(
              pull_request.assignee.login,
              pull_request.assignee.html_url
            )
          : createText("无"),
      ],
      [
        createText("标签："),
        createText(
          pull_request?.labels?.map(({ name }) => name).join(", ") || "无"
        ),
      ],
      [
        createText("里程碑："),
        createText(pull_request?.milestone?.title || "无"),
      ],
      [createText("描述："), createText(pull_request?.body || "无描述")],
    ],
  }),

  comment: ({ event: { comment, issue, discussion } }, actionText) => {
    const title = issue?.title || discussion?.title || "未知帖子";
    return {
      title: `GitHub 帖子评论：${title}`,
      content: [
        createContentItem("链接：", comment?.html_url) as [any, any],
        createContentItem("作者：", comment?.user ? createUserLink(comment.user) : createText("无")) as [any, any],
        createContentItem("描述：", comment?.body || "无描述") as [any, any]
      ],
    };
  },

  release: ({ event: { release } }, actionText) => {
    const title = release?.name || release?.tag_name || "未知版本";
    return {
      title: `GitHub Release 发布：${title}`,
      content: [
        createContentItem("链接：", release?.html_url) as [any, any],
        createContentItem("作者：", release?.author ? createUserLink(release.author) : createText("无")) as [any, any],
        createContentItem("描述：", release?.body || "无描述") as [any, any]
      ],
    };
  },
};

// Main processor
const processEvent = (event: GitHubAction) => {
  const { event_name, action } = event;
  if (!event_name) {
    console.error("Missing event_name in GitHub action");
    return null;
  }

  const actionText = getActionText(action);
  const handler = eventHandlers[event_name];

  if (!handler) {
    console.error(`No handler found for event: ${event_name}`);
    return null;
  }

  try {
    return handler(event, actionText);
  } catch (error) {
    console.error(`Error processing ${event_name} event:`, error);
    return null;
  }
};

// Main execution：Processing GitHub Events and Outputting Results
const event = JSON.parse((await stdin()) || "{}") as GitHubAction;
const zh_cn = processEvent(event);

if (zh_cn) {
  console.log(JSON.stringify({ post: { zh_cn } }));
} else {
  console.error(
    `Unsupported ${event.event_name} event & ${event.action} action`
  );
}
