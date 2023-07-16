from pathlib import Path


def on_page_content(html, page, config, files):
    is_post = any(ancestor.title == "Posts" for ancestor in page.ancestors)
    is_draft = getattr(page, "meta", {}).get("draft", False)

    if is_post and not is_draft:
        config.setdefault("rss_items", []).append({
            "title": page.title,
            "link": config["site_url"] + page.url,
            "description": f"<![CDATA[{html}]]>",
            # TODO: Get timezone programmatically
            "date": page.meta["date"].strftime("%a, %d %b %Y %T +0000"),
        })


def on_page_context(context, page, config, nav):
    if page.title == "Feed":
        context["items"] = config.get("rss_items", [])
        
        return context
