import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { ContactMessage } from "../../lib/types";
import { EmptyState, PageHeader, Spinner } from "../components/ui";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inbox", showArchived],
    queryFn: () =>
      api.get<{ messages: ContactMessage[]; unreadCount: number }>(
        `/admin/inbox?archived=${showArchived}`,
      ),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ContactMessage> }) =>
      api.put(`/admin/inbox/${id}`, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/inbox/${id}`),
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Messages sent through the contact form on the site."
        actions={
          <button
            type="button"
            className="admin-button admin-button--ghost"
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived ? "Show current" : "Show archived"}
          </button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !data || data.messages.length === 0 ? (
        <EmptyState message={showArchived ? "Nothing archived." : "No messages yet."} />
      ) : (
        <div className="admin-message-list">
          {data.messages.map((message) => {
            const isOpen = openId === message.id;

            return (
              <article
                key={message.id}
                className={`admin-message${message.isRead ? "" : " is-unread"}`}
              >
                <button
                  type="button"
                  className="admin-message-head"
                  onClick={() => {
                    setOpenId(isOpen ? null : message.id);
                    if (!message.isRead) {
                      update.mutate({ id: message.id, body: { isRead: true } });
                    }
                  }}
                >
                  <span className="admin-message-from">
                    <strong>{message.name}</strong>
                    <span className="admin-hint">{message.email}</span>
                  </span>
                  <span className="admin-message-subject">{message.subject}</span>
                  <span className="admin-hint">{formatDateTime(message.createdAt)}</span>
                </button>

                {isOpen ? (
                  <div className="admin-message-body">
                    <p>{message.message}</p>
                    <div className="admin-item-actions">
                      <a
                        className="admin-button admin-button--primary"
                        href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                      >
                        Reply by email
                      </a>
                      <button
                        type="button"
                        className="admin-button"
                        onClick={() =>
                          update.mutate({
                            id: message.id,
                            body: { isArchived: !message.isArchived },
                          })
                        }
                      >
                        {message.isArchived ? "Move to inbox" : "Archive"}
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--danger"
                        onClick={() => {
                          if (window.confirm("Delete this message permanently?")) {
                            remove.mutate(message.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
