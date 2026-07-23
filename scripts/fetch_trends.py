# 구글 트렌드 RSS 및 뉴스 데이터를 수집하여 100개 순위, 이슈 요약, 블로그 포스트 및 JSON을 자동 생성하는 스크립트
import datetime
import glob
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from typing import Dict, List, Any

# 구글 트렌드 RSS 엔드포인트 목록 (한국 포함 주요 국가 확대)
TREND_RSS_URLS = [
    "https://trends.google.com/trending/rss?geo=KR",
    "https://trends.google.com/trending/rss?geo=US",
    "https://trends.google.com/trending/rss?geo=JP",
    "https://trends.google.com/trending/rss?geo=GB",
    "https://trends.google.com/trending/rss?geo=CA",
    "https://trends.google.com/trending/rss?geo=AU",
    "https://trends.google.com/trending/rss?geo=DE",
    "https://trends.google.com/trending/rss?geo=FR",
    "https://trends.google.com/trending/rss?geo=IN",
    "https://trends.google.com/trending/rss?geo=BR",
    "https://trends.google.com/trending/rss?geo=TW",
    "https://trends.google.com/trending/rss?geo=SG"
]

NS = {
    'ht': 'https://trends.google.com/trending/rss',
    'atom': 'http://www.w3.org/2005/Atom'
}

def fetch_rss_items(url: str) -> List[Dict[str, Any]]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8"
    }
    items = []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read().decode('utf-8')
            root = ET.fromstring(xml_data)
            
            channel = root.find('channel')
            if channel is None:
                return items
            
            for item in channel.findall('item'):
                title_elem = item.find('title')
                title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""
                if not title:
                    continue

                traffic_elem = item.find('ht:approx_traffic', NS)
                traffic = traffic_elem.text.strip() if traffic_elem is not None and traffic_elem.text else "1,000+"

                picture_elem = item.find('ht:picture', NS)
                picture = picture_elem.text.strip() if picture_elem is not None and picture_elem.text else ""

                news_list = []
                summary_bits = []
                for news_item in item.findall('ht:news_item', NS):
                    n_title_elem = news_item.find('ht:news_item_title', NS)
                    n_snippet_elem = news_item.find('ht:news_item_snippet', NS)
                    n_url_elem = news_item.find('ht:news_item_url', NS)
                    n_source_elem = news_item.find('ht:news_item_source', NS)

                    n_title = n_title_elem.text.strip() if n_title_elem is not None and n_title_elem.text else ""
                    n_snippet = n_snippet_elem.text.strip() if n_snippet_elem is not None and n_snippet_elem.text else ""
                    n_url = n_url_elem.text.strip() if n_url_elem is not None and n_url_elem.text else ""
                    n_source = n_source_elem.text.strip() if n_source_elem is not None and n_source_elem.text else ""

                    clean_title = re.sub(r'<[^>]+>', '', n_title)
                    clean_snippet = re.sub(r'<[^>]+>', '', n_snippet)

                    news_list.append({
                        "title": clean_title,
                        "snippet": clean_snippet,
                        "url": n_url,
                        "source": n_source
                    })
                    if clean_title:
                        summary_bits.append(f"• {clean_title}" + (f": {clean_snippet}" if clean_snippet else ""))

                summary = "\n".join(summary_bits) if summary_bits else f"'{title}' 검색 급증 이슈입니다."

                items.append({
                    "title": title,
                    "traffic": traffic,
                    "summary": summary,
                    "news": news_list,
                    "image": picture
                })
    except Exception as e:
        print(f"Error reading RSS from {url}: {e}")
    return items

def extract_top_100_trends() -> List[Dict[str, Any]]:
    trends = []
    seen_titles = set()

    for url in TREND_RSS_URLS:
        rss_items = fetch_rss_items(url)
        for item in rss_items:
            normalized_title = item['title'].lower()
            if normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                trends.append(item)
            if len(trends) >= 100:
                break
        if len(trends) >= 100:
            break

    for idx, item in enumerate(trends, start=1):
        item['rank'] = idx

    return trends[:100]

def generate_markdown_post(today_str: str, trends: List[Dict[str, Any]]) -> str:
    post_date_formatted = datetime.datetime.now().strftime("%Y년 %m월 %d일")
    
    md_content = f"""---
layout: post
title: "{post_date_formatted} 구글 트렌드 인기 검색 순위 Top 100 & 이슈 요약"
date: {today_str} 09:00:00 +0900
categories: [Trends, Daily]
tags: [GoogleTrends, IssueSummary, Top100]
---

# 📈 {post_date_formatted} 구글 트렌드 인기 검색 순위 Top 100

오늘 가장 많은 관심과 검색을 받은 **구글 인기 검색어 100개의 순위와 주요 뉴스 이슈 요약본**입니다.

---

## 🏆 주요 트렌드 하이라이트 (1위 ~ 10위)

"""
    for item in trends[:10]:
        md_content += f"### {item['rank']}위: **{item['title']}** (검색량: {item['traffic']})\n\n"
        if item.get("image"):
            md_content += f"![{item['title']}]({item['image']})\n\n"
        md_content += f"**💡 이슈 요약**\n\n{item['summary']}\n\n"
        if item.get("news"):
            md_content += "**📰 관련 뉴스**\n"
            for news in item["news"]:
                md_content += f"- [{news['title']}]({news['url']}) ({news['source']})\n"
        md_content += "\n---\n\n"

    md_content += "## 📋 전체 검색 순위 리스트 (1위 ~ 100위)\n\n"
    md_content += "| 순위 | 키워드 | 검색량 | 관련 주요 뉴스 요약 |\n"
    md_content += "| :---: | :--- | :---: | :--- |\n"

    for item in trends:
        news_summary_single = item['summary'].replace('\n', ' ') if item['summary'] else "-"
        if len(news_summary_single) > 120:
            news_summary_single = news_summary_single[:117] + "..."
        md_content += f"| {item['rank']} | **{item['title']}** | {item['traffic']} | {news_summary_single} |\n"

    md_content += f"\n\n---\n*데이터 수집 일시: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (KST)*\n"
    return md_content

def update_readme():
    post_files = glob.glob("_posts/*.md")
    post_files.sort(reverse=True)
    posts = []

    for filepath in post_files:
        filename = os.path.basename(filepath)
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", filename)
        date_str = date_match.group(1) if date_match else ""
        
        title = filename
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            title_match = re.search(r'title:\s*["\']?(.*?)["\']?\s*\n', content)
            if title_match:
                title = title_match.group(1).strip()
        
        rel_link = f"_posts/{filename}"
        posts.append({"date": date_str, "title": title, "link": rel_link})

    table_rows = []
    for p in posts:
        table_rows.append(f"| {p['date']} | {p['title']} | [{p['title']}]({p['link']}) |")

    table_content = "\n".join(table_rows) if table_rows else "| - | 포스트가 없습니다. | - |"

    readme_text = f"""# 📈 Google Trends Top 100 & Issue Summary Agent

구글 트렌드의 인기 검색어 상위 100개 및 주요 뉴스 이슈 요약본을 매일 자동 수집하고 업데이트하는 GitHub Pages 레포지토리입니다.

## 🔗 웹 대시보드
[👉 Google Trends Top 100 대시보드 바로가기](https://3hongwork-hub.github.io/ggtrend-top100/)

## 📝 매일 자동 발행 포스트 목록 (최신순)

| 발행일 | 제목 | 링크 |
| :--- | :--- | :--- |
{table_content}

---
*이 레포지토리의 구글 트렌드 데이터 및 블로그 포스트는 GitHub Actions 스케줄러에 의해 매일 아침 자동으로 갱신됩니다.*
"""

    with open("README.md", "w", encoding="utf-8") as f:
        f.write(readme_text.strip() + "\n")
    print("Successfully updated README.md")

def main():
    os.makedirs("_posts", exist_ok=True)
    os.makedirs("data/history", exist_ok=True)

    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    print(f"Fetching Google Trends RSS data for {today_str}...")
    
    trends = extract_top_100_trends()
    print(f"Fetched {len(trends)} trend items.")

    # Save trends.json for Web UI (latest)
    data_payload = {
        "date": today_str,
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(trends),
        "trends": trends
    }
    with open("data/trends.json", "w", encoding="utf-8") as f:
        json.dump(data_payload, f, ensure_ascii=False, indent=2)
    print("Saved data/trends.json")

    # Save daily history file data/history/YYYY-MM-DD.json
    history_filepath = f"data/history/{today_str}.json"
    with open(history_filepath, "w", encoding="utf-8") as f:
        json.dump(data_payload, f, ensure_ascii=False, indent=2)
    print(f"Saved {history_filepath}")

    # Update history_dates.json
    history_files = glob.glob("data/history/*.json")
    available_dates = []
    for hf in history_files:
        basename = os.path.basename(hf)
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", basename)
        if date_match:
            available_dates.append(date_match.group(1))
    available_dates.sort(reverse=True)

    with open("data/history_dates.json", "w", encoding="utf-8") as f:
        json.dump({"dates": available_dates}, f, ensure_ascii=False, indent=2)
    print("Updated data/history_dates.json")

    # Generate Markdown Post for _posts
    post_filename = f"_posts/{today_str}-google-trends-top100.md"
    post_md = generate_markdown_post(today_str, trends)
    with open(post_filename, "w", encoding="utf-8") as f:
        f.write(post_md)
    print(f"Generated blog post: {post_filename}")

    # Update README.md
    update_readme()

if __name__ == "__main__":
    main()
