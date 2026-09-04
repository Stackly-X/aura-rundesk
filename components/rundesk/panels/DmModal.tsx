"use client";

import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { User } from "@/lib/rundesk/types";
import Avatar from "../Avatar";

interface Props {
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onSelect: (users: User[]) => void;
}

export default function DmModal({
  users,
  currentUserId,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return users.filter((user) => {
      if (user.id === currentUserId) return false;
      if (!needle) return true;

      return `${user.name} ${user.email}`
        .toLowerCase()
        .includes(needle);
    });
  }, [users, currentUserId, query]);

  const selectedUsers = users.filter((user) => selected.includes(user.id));

  return (
    <div className="modal-backdrop">
      <section className="dialog-card dm-dialog compact-dm-dialog">
        <header>
          <div>
            <h2>New direct message</h2>
            <p>Select one person or create a group conversation.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <label className="dm-search">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workspace members"
          />
        </label>

        {selectedUsers.length > 0 && (
          <div className="dm-selected-people">
            {selectedUsers.map((user) => (
              <button
                type="button"
                key={user.id}
                onClick={() =>
                  setSelected((current) => current.filter((id) => id !== user.id))
                }
              >
                <Avatar user={user} size={20} />
                <span>{user.name}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        )}

        <div className="dm-user-results">
          {filtered.map((user) => {
            const active = selected.includes(user.id);

            return (
              <button
                type="button"
                className={active ? "selected" : ""}
                key={user.id}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(user.id)
                      ? current.filter((id) => id !== user.id)
                      : [...current, user.id],
                  )
                }
              >
                <Avatar user={user} size={32} />

                <span>
                  <strong>{user.name}</strong>
                  {user.email && <small>{user.email}</small>}
                </span>

                <i className="dm-check">{active && <Check size={14} />}</i>
              </button>
            );
          })}

          {!filtered.length && (
            <p className="panel-empty-copy">No matching workspace members.</p>
          )}
        </div>

        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={!selected.length}
            onClick={() => onSelect(selectedUsers)}
          >
            {selected.length > 1 ? `Message ${selected.length} people` : "Message"}
          </button>
        </footer>
      </section>
    </div>
  );
}