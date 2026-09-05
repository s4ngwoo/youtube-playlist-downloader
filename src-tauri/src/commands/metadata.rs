use crate::models::{AudioMetadata, AudioFileEntry};
use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::tag::{Accessor, TagExt, ItemKey, TagItem, ItemValue};
use lofty::picture::{Picture, PictureType};
use base64::{Engine as _, engine::general_purpose::STANDARD as b64_std};

fn string_to_item_key(s: &str) -> Option<ItemKey> {
    match s.to_lowercase().as_str() {
        "albumtitle" => Some(ItemKey::AlbumTitle),
        "setsubtitle" => Some(ItemKey::SetSubtitle),
        "showname" => Some(ItemKey::ShowName),
        "contentgroup" => Some(ItemKey::ContentGroup),
        "tracktitle" => Some(ItemKey::TrackTitle),
        "tracksubtitle" => Some(ItemKey::TrackSubtitle),
        "originalalbumtitle" => Some(ItemKey::OriginalAlbumTitle),
        "originalartist" => Some(ItemKey::OriginalArtist),
        "originallyricist" => Some(ItemKey::OriginalLyricist),
        "albumtitlesortorder" => Some(ItemKey::AlbumTitleSortOrder),
        "albumartistsortorder" => Some(ItemKey::AlbumArtistSortOrder),
        "tracktitlesortorder" => Some(ItemKey::TrackTitleSortOrder),
        "trackartistsortorder" => Some(ItemKey::TrackArtistSortOrder),
        "shownamesortorder" => Some(ItemKey::ShowNameSortOrder),
        "composersortorder" => Some(ItemKey::ComposerSortOrder),
        "albumartist" => Some(ItemKey::AlbumArtist),
        "albumartists" => Some(ItemKey::AlbumArtists),
        "trackartist" => Some(ItemKey::TrackArtist),
        "trackartists" => Some(ItemKey::TrackArtists),
        "arranger" => Some(ItemKey::Arranger),
        "writer" => Some(ItemKey::Writer),
        "composer" => Some(ItemKey::Composer),
        "conductor" => Some(ItemKey::Conductor),
        "director" => Some(ItemKey::Director),
        "engineer" => Some(ItemKey::Engineer),
        "lyricist" => Some(ItemKey::Lyricist),
        "mixdj" => Some(ItemKey::MixDj),
        "mixengineer" => Some(ItemKey::MixEngineer),
        "performer" => Some(ItemKey::Performer),
        "producer" => Some(ItemKey::Producer),
        "publisher" => Some(ItemKey::Publisher),
        "label" => Some(ItemKey::Label),
        "internetradiostationname" => Some(ItemKey::InternetRadioStationName),
        "internetradiostationowner" => Some(ItemKey::InternetRadioStationOwner),
        "remixer" => Some(ItemKey::Remixer),
        "discnumber" => Some(ItemKey::DiscNumber),
        "disctotal" => Some(ItemKey::DiscTotal),
        "tracknumber" => Some(ItemKey::TrackNumber),
        "tracktotal" => Some(ItemKey::TrackTotal),
        "popularimeter" => Some(ItemKey::Popularimeter),
        "parentaladvisory" => Some(ItemKey::ParentalAdvisory),
        "recordingdate" => Some(ItemKey::RecordingDate),
        "year" => Some(ItemKey::Year),
        "releasedate" => Some(ItemKey::ReleaseDate),
        "originalreleasedate" => Some(ItemKey::OriginalReleaseDate),
        "isrc" => Some(ItemKey::Isrc),
        "barcode" => Some(ItemKey::Barcode),
        "acoustid" => Some(ItemKey::AcoustId),
        "acoustidfingerprint" => Some(ItemKey::AcoustIdFingerprint),
        "catalognumber" => Some(ItemKey::CatalogNumber),
        "work" => Some(ItemKey::Work),
        "movement" => Some(ItemKey::Movement),
        "movementnumber" => Some(ItemKey::MovementNumber),
        "movementtotal" => Some(ItemKey::MovementTotal),
        "releasecountry" => Some(ItemKey::ReleaseCountry),
        "musicbrainzrecordingid" => Some(ItemKey::MusicBrainzRecordingId),
        "musicbrainztrackid" => Some(ItemKey::MusicBrainzTrackId),
        "musicbrainzreleaseid" => Some(ItemKey::MusicBrainzReleaseId),
        "musicbrainzreleasegroupid" => Some(ItemKey::MusicBrainzReleaseGroupId),
        "musicbrainzartistid" => Some(ItemKey::MusicBrainzArtistId),
        "musicbrainzreleaseartistid" => Some(ItemKey::MusicBrainzReleaseArtistId),
        "musicbrainzworkid" => Some(ItemKey::MusicBrainzWorkId),
        "musicbrainzreleasetype" => Some(ItemKey::MusicBrainzReleaseType),
        "flagcompilation" => Some(ItemKey::FlagCompilation),
        "flagpodcast" => Some(ItemKey::FlagPodcast),
        "fileowner" => Some(ItemKey::FileOwner),
        "taggingtime" => Some(ItemKey::TaggingTime),
        "length" => Some(ItemKey::Length),
        "originalfilename" => Some(ItemKey::OriginalFileName),
        "originalmediatype" => Some(ItemKey::OriginalMediaType),
        "encodedby" => Some(ItemKey::EncodedBy),
        "encodersoftware" => Some(ItemKey::EncoderSoftware),
        "encodersettings" => Some(ItemKey::EncoderSettings),
        "encodingtime" => Some(ItemKey::EncodingTime),
        "replaygainalbumgain" => Some(ItemKey::ReplayGainAlbumGain),
        "replaygainalbumpeak" => Some(ItemKey::ReplayGainAlbumPeak),
        "replaygaintrackgain" => Some(ItemKey::ReplayGainTrackGain),
        "replaygaintrackpeak" => Some(ItemKey::ReplayGainTrackPeak),
        "r128trackgain" => Some(ItemKey::R128TrackGain),
        "r128albumgain" => Some(ItemKey::R128AlbumGain),
        "audiofileurl" => Some(ItemKey::AudioFileUrl),
        "audiosourceurl" => Some(ItemKey::AudioSourceUrl),
        "commercialinformationurl" => Some(ItemKey::CommercialInformationUrl),
        "copyrighturl" => Some(ItemKey::CopyrightUrl),
        "trackartisturl" => Some(ItemKey::TrackArtistUrl),
        "radiostationurl" => Some(ItemKey::RadioStationUrl),
        "paymenturl" => Some(ItemKey::PaymentUrl),
        "publisherurl" => Some(ItemKey::PublisherUrl),
        "genre" => Some(ItemKey::Genre),
        "initialkey" => Some(ItemKey::InitialKey),
        "color" => Some(ItemKey::Color),
        "mood" => Some(ItemKey::Mood),
        "bpm" => Some(ItemKey::Bpm),
        "integerbpm" => Some(ItemKey::IntegerBpm),
        "copyrightmessage" => Some(ItemKey::CopyrightMessage),
        "license" => Some(ItemKey::License),
        "podcastdescription" => Some(ItemKey::PodcastDescription),
        "podcastseriescategory" => Some(ItemKey::PodcastSeriesCategory),
        "podcasturl" => Some(ItemKey::PodcastUrl),
        "podcastglobaluniqueid" => Some(ItemKey::PodcastGlobalUniqueId),
        "podcastkeywords" => Some(ItemKey::PodcastKeywords),
        "comment" => Some(ItemKey::Comment),
        "description" => Some(ItemKey::Description),
        "language" => Some(ItemKey::Language),
        "script" => Some(ItemKey::Script),
        "lyrics" => Some(ItemKey::Lyrics),
        "unsynclyrics" => Some(ItemKey::UnsyncLyrics),
        "applexid" => Some(ItemKey::AppleXid),
        "appleid3v2contentgroup" => Some(ItemKey::AppleId3v2ContentGroup),
        _ => None,
    }
}

#[tauri::command]
pub fn list_audio_files(dir_path: String) -> Result<Vec<AudioFileEntry>, crate::AppError> {
    use std::fs;
    
    let path = std::path::Path::new(&dir_path);
    if !path.exists() || !path.is_dir() {
        return Err(crate::AppError::FileSystemError("유효하지 않은 디렉토리입니다.".into()));
    }

    let mut audio_files = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                if let Some(ext) = file_path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "m4a" || ext_lower == "mp3" || ext_lower == "flac" {
                        let path_str = file_path.to_string_lossy().into_owned();
                        let name_str = file_path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                        
                        // 메타데이터 읽기 시도
                        let metadata = read_metadata(path_str.clone()).unwrap_or(AudioMetadata {
                            title: None,
                            artist: None,
                            album: None,
                            lyrics: None,
                            cover_art_base64: None,
                            comment: None,
                            custom_tags: None,
                        });

                        audio_files.push(AudioFileEntry {
                            file_path: path_str,
                            file_name: name_str,
                            metadata,
                        });
                    }
                }
            }
        }
    }

    Ok(audio_files)
}

#[tauri::command]
pub fn read_metadata(file_path: String) -> Result<AudioMetadata, crate::AppError> {
    let tagged_file = Probe::open(&file_path)
        .map_err(|e| crate::AppError::MetadataError(format!("Failed to open file: {}", e)))?
        .read()
        .map_err(|e| crate::AppError::MetadataError(format!("Failed to read file: {}", e)))?;

    let tag = match tagged_file.primary_tag() {
        Some(primary_tag) => primary_tag,
        None => match tagged_file.first_tag() {
            Some(first_tag) => first_tag,
            None => return Ok(AudioMetadata {
                title: None, artist: None, album: None, lyrics: None, cover_art_base64: None, comment: None, custom_tags: None
            }),
        }
    };

    let title = tag.title().map(|s| s.into_owned());
    let artist = tag.artist().map(|s| s.into_owned());
    let album = tag.album().map(|s| s.into_owned());
    
    let mut lyrics = None;
    let mut comment = None;
    let mut custom_tags = std::collections::HashMap::new();

    for item in tag.items() {
        match item.key() {
            lofty::tag::ItemKey::Lyrics => {
                if let lofty::tag::ItemValue::Text(text) = item.value() {
                    lyrics = Some(text.clone());
                }
            },
            lofty::tag::ItemKey::Comment | lofty::tag::ItemKey::Description => {
                if let lofty::tag::ItemValue::Text(text) = item.value() {
                    let text_clone = text.clone();
                    if let Some(ref mut c) = comment {
                        *c = format!("{}\n{}", c, text_clone);
                    } else {
                        comment = Some(text_clone);
                    }
                }
            },
            lofty::tag::ItemKey::TrackTitle | lofty::tag::ItemKey::TrackArtist | lofty::tag::ItemKey::AlbumTitle => {
                // Ignore standard fields mapped to struct properties
            },
            other_key => {
                if let lofty::tag::ItemValue::Text(text) = item.value() {
                    let key_str = format!("{:?}", other_key);
                    custom_tags.insert(key_str, text.clone());
                }
            }
        }
    }

    let mut cover_art_base64 = None;
    if let Some(picture) = tag.pictures().first() {
        let b64 = b64_std.encode(picture.data());
        let mime = picture.mime_type().unwrap_or(&lofty::picture::MimeType::Jpeg).as_str();
        cover_art_base64 = Some(format!("data:{};base64,{}", mime, b64));
    }

    Ok(AudioMetadata {
        title,
        artist,
        album,
        lyrics,
        cover_art_base64,
        comment,
        custom_tags: if custom_tags.is_empty() { None } else { Some(custom_tags) },
    })
}

#[tauri::command]
pub fn write_metadata(file_path: String, metadata: AudioMetadata) -> Result<String, crate::AppError> {
    let mut tagged_file = Probe::open(&file_path)
        .map_err(|e| crate::AppError::MetadataError(format!("Failed to open file: {}", e)))?
        .read()
        .map_err(|e| crate::AppError::MetadataError(format!("Failed to read file: {}", e)))?;

    let tag_type = tagged_file.primary_tag_type();
    let mut tag = tagged_file.primary_tag_mut().map(|t| t.clone()).unwrap_or_else(|| lofty::tag::Tag::new(tag_type));

    if let Some(title) = metadata.title {
        tag.set_title(title);
    }
    if let Some(artist) = metadata.artist {
        tag.set_artist(artist);
    }
    if let Some(album) = metadata.album {
        tag.set_album(album);
    }
    
    if let Some(lyrics) = metadata.lyrics {
        tag.insert(TagItem::new(ItemKey::Lyrics, ItemValue::Text(lyrics)));
    }

    if let Some(comment) = metadata.comment {
        tag.insert(TagItem::new(ItemKey::Comment, ItemValue::Text(comment)));
    }

    if let Some(custom_tags) = metadata.custom_tags {
        for (k, v) in custom_tags {
            if let Some(key) = string_to_item_key(&k) {
                tag.insert(TagItem::new(key, ItemValue::Text(v)));
            } else {
                println!("[Warning] Unrecognized tag key: {}", k);
            }
        }
    }

    if let Some(cover_b64) = metadata.cover_art_base64 {
        // Expected format: data:image/jpeg;base64,...
        if let Some(idx) = cover_b64.find("base64,") {
            let b64_data = &cover_b64[idx + 7..];
            if let Ok(decoded) = b64_std.decode(b64_data) {
                if let Ok(mut picture) = Picture::from_reader(&mut std::io::Cursor::new(decoded)) {
                    picture.set_pic_type(PictureType::CoverFront);
                    tag.set_picture(0, picture);
                }
            }
        }
    }

    tag.save_to_path(&file_path, lofty::config::WriteOptions::new())
        .map_err(|e| crate::AppError::MetadataError(format!("Failed to save metadata: {}", e)))?;

    Ok("Metadata successfully updated.".into())
}
