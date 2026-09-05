use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct YtDlpDump {
    _type: Option<String>,
    title: Option<String>,
    entries: Option<Vec<YtDlpEntry>>,
}

#[derive(Deserialize, Debug)]
struct YtDlpEntry {
    url: Option<String>,
}

fn main() {
    let json = r#"{
        "_type": "playlist",
        "title": "My Playlist",
        "entries": [
            {"url": "http://1"},
            {"url": "http://2"}
        ]
    }"#;
    let dump: YtDlpDump = serde_json::from_str(json).unwrap();
    println!("{:?}", dump);
}
