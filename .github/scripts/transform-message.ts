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

// Event handlers
const handlePushEvent = ({
  head_commit,
  ref,
  ref_name,
  server_url,
  repository,
  actor,
}: GitHubAction) => ({
  title: "GitHub 代码提交",
  content: [
    [createText("提交链接："), createLink(head_commit?.url, head_commit?.url)],
    [
      createText("代码分支："),
      createLink(ref, `${server_url}/${repository}/tree/${ref_name}`),
    ],
    [createText("提交作者："), createLink(actor, `${server_url}/${actor}`)],
    [createText("提交信息："), createText(head_commit?.message)],
  ],
});

const handleIssueEvent = ({ issue }: GitHubAction, actionText: string) => ({
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
        : createText(""),
    ],
    [
      createText(
        `标签：${issue?.labels?.map(({ name }) => name).join(", ") || ""}`
      ),
    ],
    [createText(`里程碑：${issue?.milestone?.title || ""}`)],
    [createText("描述："), createText(issue?.body)],
  ],
});

// ... other event handlers (pull_request, discussion, comment, release) ...

// Main processor
const processEvent = (event: GitHubAction) => {
  const { event_name, action } = event;
  const actionText = getActionText(action);

  switch (event_name) {
    case "push":
      return handlePushEvent(event);
    case "issues":
      return handleIssueEvent(event, actionText);
    // ... other cases ...
    default:
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
