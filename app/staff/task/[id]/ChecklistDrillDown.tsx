"use client";

import { useState } from "react";
import type { ChecklistNode } from "@/lib/checklists/types";
import styles from "./ChecklistDrillDown.module.css";

type Props = {
  root: ChecklistNode;
  onClose: () => void;
};

type Crumb = { node: ChecklistNode };

export default function ChecklistDrillDown({ root, onClose }: Props) {
  const [stack, setStack] = useState<Crumb[]>([{ node: root }]);

  const current = stack[stack.length - 1].node;
  const isLeaf = !current.children || current.children.length === 0;

  function drillInto(child: ChecklistNode) {
    setStack((prev) => [...prev, { node: child }]);
  }

  function goBack() {
    if (stack.length <= 1) {
      onClose();
      return;
    }
    setStack((prev) => prev.slice(0, -1));
  }

  const breadcrumb = stack
    .map((c) => c.node.label)
    .join(" / ");

  return (
    <div className={styles.overlay}>
      <div className={styles.shell}>

        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={goBack}
            aria-label="Back"
          >
            &lsaquo;
          </button>
          <div className={styles.crumb}>{breadcrumb}</div>
        </div>

        <div className={styles.scroll}>
          {isLeaf ? (
            <div className={styles.leaf}>
              <h2 className={styles.leafTitle}>{current.label}</h2>

              {current.detail ? (
                <div className={styles.leafSection}>
                  <div className={styles.leafLabel}>DETAIL</div>
                  <p className={styles.leafBody}>{current.detail}</p>
                </div>
              ) : null}

              {current.chemicals && current.chemicals.length > 0 ? (
                <div className={styles.leafSection}>
                  <div className={styles.leafLabel}>CHEMICALS</div>
                  <ul className={styles.leafList}>
                    {current.chemicals.map((c) => (
                      <li key={c} className={styles.leafListItem}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {current.tools && current.tools.length > 0 ? (
                <div className={styles.leafSection}>
                  <div className={styles.leafLabel}>TOOLS</div>
                  <ul className={styles.leafList}>
                    {current.tools.map((t) => (
                      <li key={t} className={styles.leafListItem}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {current.photo ? (
                <div className={styles.photoPill}>PHOTO REQUIRED</div>
              ) : null}

              {!current.detail && !current.chemicals && !current.tools && !current.photo ? (
                <p className={styles.leafMuted}>No additional detail for this step.</p>
              ) : null}
            </div>
          ) : (
            <div className={styles.list}>
              {current.children!.map((child) => {
                const hasChildren = child.children && child.children.length > 0;
                return (
                  <button
                    key={child.id}
                    type="button"
                    className={styles.row}
                    onClick={() => drillInto(child)}
                  >
                    <div className={styles.rowMain}>
                      <div className={styles.rowLabel}>{child.label}</div>
                      {hasChildren ? (
                        <div className={styles.rowSub}>
                          {child.children!.length} {child.children!.length === 1 ? "step" : "steps"}
                        </div>
                      ) : (
                        <div className={styles.rowSub}>
                          {child.detail ? "Detail" : ""}
                          {child.photo ? (child.detail ? " · Photo" : "Photo required") : ""}
                          {!child.detail && !child.photo ? "Tap for detail" : ""}
                        </div>
                      )}
                    </div>
                    <div className={styles.chev}>&rsaquo;</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
