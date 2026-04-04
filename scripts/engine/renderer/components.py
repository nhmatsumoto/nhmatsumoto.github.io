import html
from datetime import datetime
from typing import Any
from ..i18n import translate, render_localized_date
from ..utils import site_href

def render_breadcrumbs(steps: list[dict[str, str]], i18n: dict[str, Any], locale: str) -> str:
    links = []
    for step in steps:
        label = html.escape(step["label"])
        i18n_key = step.get("key", "")
        i18n_attr = f' data-i18n="{i18n_key}"' if i18n_key else ""
        if step["url"]:
            links.append(f'<a href="{html.escape(step["url"])}"{i18n_attr}>{label}</a>')
        else:
            links.append(f'<span{i18n_attr}>{label}</span>')
    return f'<nav class="breadcrumbs" aria-label="Breadcrumb">{" / ".join(links)}</nav>'

def render_tag_list(tags: list[str]) -> str:
    if not tags: return ""
    items = "".join(f'<span class="tag-item">#{html.escape(t)}</span>' for t in tags)
    return f'<div class="tag-list">{items}</div>'

def render_badge_list(badges: list[str]) -> str:
    if not badges: return ""
    items = "".join(f'<span class="badge-item">{html.escape(b)}</span>' for b in badges)
    return f'<div class="badge-list">{items}</div>'

def render_stack_list(stack: list[str]) -> str:
    if not stack: return ""
    items = "".join(f'<span class="stack-item">{html.escape(s)}</span>' for s in stack)
    return f'<div class="stack-list">{items}</div>'

def render_status_badge(status: str, i18n: dict[str, Any], locale: str) -> str:
    from ..constants import STATUS_LABELS
    label = translate(i18n, locale, f"status.{status}", STATUS_LABELS.get(status, status))
    return f'<span class="status-badge status-{status}" data-i18n="status.{status}">{html.escape(label)}</span>'

def render_metric_list(metrics: list[str], escape_items: bool = True) -> str:
    if not metrics: return ""
    items = "".join(f"<li>{html.escape(m) if escape_items else m}</li>" for m in metrics)
    return f'<ul class="metric-list">{items}</ul>'

def render_reading_time(minutes: int, i18n: dict[str, Any], locale: str) -> str:
    label = translate(i18n, locale, "common.reading_time", "{min} min read").replace("{min}", str(minutes))
    return f'<span class="reading-time" data-i18n="common.reading_time" data-i18n-min="{minutes}">{html.escape(label)}</span>'

def render_developer_profile(site: dict[str, str], i18n: dict[str, Any], locale: str) -> str:
    return f"""
    <div class="developer-profile">
      <div class="profile-header">
        <div class="profile-avatar">
          <span class="avatar-initials">{html.escape((site.get('author') or 'A')[0])}</span>
        </div>
        <div class="profile-info">
          <p class="profile-name">{html.escape(str(site.get('author') or 'Author'))}</p>
          <p class="profile-role" data-i18n="common.role">Technical Architecture & Engineering</p>
        </div>
      </div>
      <div class="profile-links">
        <a href="{html.escape(site.get('linkedin_url', ''))}" target="_blank" rel="noopener">LinkedIn</a>
        <a href="{html.escape(site.get('github_url', ''))}" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
    """
