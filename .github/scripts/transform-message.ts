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

const {
  event_name,
  action,
  actor,
  server_url,
  repository,
  ref,
  ref_name,
  event,
} = JSON.parse((await stdin()) || "{}") as GitHubAction;

const { head_commit, issue, pull_request, discussion, comment, release } =
  event;
const actionText =
  action === "closed" ? "关闭" : action?.includes("open") ? "打开" : "编辑";

const zh_cn =
  event_name === "push"
    ? {
        title: "GitHub 代码提交",
        content: [
          [
            { tag: "text", text: "提交链接：" },
            {
              tag: "a",
              text: head_commit?.url,
              href: head_commit?.url,
            },
          ],
          [
            { tag: "text", text: "代码分支：" },
            {
              tag: "a",
              text: ref,
              href: `${server_url}/${repository}/tree/${ref_name}`,
            },
          ],
          [
            { tag: "text", text: "提交作者：" },
            { tag: "a", text: actor, href: `${server_url}/${actor}` },
          ],
          [
            { tag: "text", text: "提交信息：" },
            { tag: "text", text: head_commit?.message },
          ],
        ],
      }
    : event_name === "issues"
    ? {
        title: `GitHub issue ${actionText}：${issue?.title}`,
        content: [
          [
            { tag: "text", text: "链接：" },
            {
              tag: "a",
              text: issue?.html_url,
              href: issue?.html_url,
            },
          ],
          [
            { tag: "text", text: "作者：" },
            {
              tag: "a",
              text: issue?.user?.login,
              href: issue?.user?.html_url,
            },
          ],
          [
            { tag: "text", text: "指派：" },
            {
              tag: issue?.assignee ? "a" : "text",
              text: issue?.assignee?.login || "",
              href: issue?.assignee?.html_url,
            },
          ],
          [
            {
              tag: "text",
              text: `标签：${
                issue?.labels?.map(({ name }) => name).join(", ") || ""
              }`,
            },
          ],
          [
            {
              tag: "text",
              text: `里程碑：${issue?.milestone?.title || ""}`,
            },
          ],
          [
            { tag: "text", text: "描述：" },
            { tag: "text", text: issue?.body },
          ],
        ],
      }
    : event_name === "pull_request"
    ? {
        title: `GitHub PR ${actionText}：${pull_request?.title}`,
        content: [
          [
            { tag: "text", text: "链接：" },
            {
              tag: "a",
              text: pull_request?.html_url,
              href: pull_request?.html_url,
            },
          ],
          [
            { tag: "text", text: "作者：" },
            {
              tag: "a",
              text: pull_request?.user.login,
              href: pull_request?.user.html_url,
            },
          ],
          [
            { tag: "text", text: "指派：" },
            {
              tag: issue?.assignee ? "a" : "text",
              text: issue?.assignee?.login || "",
              href: issue?.assignee?.html_url,
            },
          ],
          [
            {
              tag: "text",
              text: `标签：${
                pull_request?.labels.map(({ name }) => name).join(", ") || ""
              }`,
            },
          ],
          [
            {
              tag: "text",
              text: `里程碑：${pull_request?.milestone?.title || ""}`,
            },
          ],
          [
            { tag: "text", text: "描述：" },
            { tag: "text", text: pull_request?.body },
          ],
        ],
      }
    : event_name === "discussion"
    ? {
        title: `GitHub 帖子${action === "created" ? "发布" : "编辑"}：${
          discussion?.title
        }`,
        content: [
          [
            { tag: "text", text: "链接：" },
            {
              tag: "a",
              text: discussion?.html_url,
              href: discussion?.html_url,
            },
          ],
          [
            { tag: "text", text: "作者：" },
            {
              tag: "a",
              text: discussion?.user?.login,
              href: discussion?.user?.html_url,
            },
          ],
          [
            {
              tag: "text",
              text: `分类：${discussion?.category.name || ""}`,
            },
          ],
          [
            {
              tag: "text",
              text: `标签：${
                discussion?.labels?.map(({ name }) => name).join(", ") || ""
              }`,
            },
          ],
          [
            { tag: "text", text: "描述：" },
            { tag: "text", text: discussion?.body },
          ],
        ],
      }
    : event_name === "issue_comment" || event_name === "discussion_comment"
    ? {
        title: `GitHub 帖子评论：${issue?.title || discussion?.title}`,
        content: [
          [
            { tag: "text", text: "链接：" },
            {
              tag: "a",
              text: comment?.html_url,
              href: comment?.html_url,
            },
          ],
          [
            { tag: "text", text: "作者：" },
            {
              tag: "a",
              text: comment?.user?.login,
              href: comment?.user?.html_url,
            },
          ],
          [
            { tag: "text", text: "描述：" },
            { tag: "text", text: comment?.body },
          ],
        ],
      }
    : event_name === "release" && action === "published"
    ? {
        title: `GitHub Release 发布：${release?.name || release?.tag_name}`,
        content: [
          [
            { tag: "text", text: "链接：" },
            {
              tag: "a",
              text: release?.html_url,
              href: release?.html_url,
            },
          ],
          [
            { tag: "text", text: "作者：" },
            {
              tag: "a",
              text: release?.author?.login,
              href: release?.author?.html_url,
            },
          ],
          [
            { tag: "text", text: "描述：" },
            { tag: "text", text: release?.body },
          ],
        ],
      }
    : null;

if (zh_cn) console.log(JSON.stringify({ post: { zh_cn } }));
else console.error(`Unsupported ${event_name} event & ${action} action`);
