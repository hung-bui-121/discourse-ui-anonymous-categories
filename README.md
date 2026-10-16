# Discourse UI Anonymous Categories

Plugin 0.1.0 — hiển thị ẩn danh trong category được chọn, giữ nguyên tài khoản thật.

## Bật tính năng

1. Tạo category như bình thường, ví dụ **Confessions**.
2. Cài plugin và khởi động lại/rebuild Discourse.
3. Vào **Admin → Settings**, tìm `ui_anonymous`.
4. Bật `ui_anonymous_categories_enabled` và chọn category tại `ui_anonymous_category_ids`.
5. Reload trình duyệt. Category con cần được chọn riêng.

Không cần bật Anonymous Mode của Discourse. Không nên bật đồng thời một plugin
khác chuyển tác giả thật thành tài khoản anonymous trong cùng category.

## Hành vi

- Áp dụng cho topic mới, reply và bài cũ. Không sửa tác giả trong database.
- Header tác giả dùng avatar chung, không có liên kết profile/user card,
  không có title/badge/flair của tài khoản. Admin cũng thấy cùng giao diện.
- Tác giả topic có nhãn **Chủ thớt / OP**.
- Một người giữ cùng số trong một topic. Số = số thứ tự bài đầu tiên của
  người đó trong topic: A viết bài #1 và #3 → đều là Người ẩn danh #1;
  B viết bài #2 → Người ẩn danh #2. Vì vậy số có thể không liên tiếp.
- Số được tính độc lập ở từng topic, có thể ngẫu nhiên trùng giữa các topic.
  Không dùng số này làm định danh xuyên forum.
- Tên/avatar tại reply-to được thay thế, nút mở bài được reply vẫn hoạt động.
- Header quote hiện “Trích dẫn”; nội dung quote giữ nguyên.
- Danh sách topic chuẩn che người đăng; summary chuẩn che các khối participant.
- Sửa/xóa/like/flag vẫn do Discourse xử lý bằng tài khoản thật.
- Bỏ chọn category hoặc tắt plugin rồi reload sẽ hiện lại thông tin thật.
- Không tạo bảng mới, không migration, không tạo tài khoản giả.

## Cài đặt self-hosted

Không upload ZIP qua trang Themes — đây là **server plugin**.

### Cách khuyến nghị: repository Git của bạn

Giải nén và đưa toàn bộ nội dung thư mục `discourse-ui-anonymous-categories`
lên một repository Git mà server truy cập được. `plugin.rb` nằm ở root repo.
Trong `/var/discourse/containers/app.yml`, thêm dòng clone vào **khối plugins
có sẵn** (giữ nguyên các plugin hiện tại):

```yaml
hooks:
  after_code:
    - exec:
        cd: $home/plugins
        cmd:
          - git clone YOUR_PLUGIN_REPOSITORY_URL
```

`YOUR_PLUGIN_REPOSITORY_URL` là chỗ điền URL repo của bạn, chưa có repo được
publish kèm gói này. Nếu server dùng private repo, dùng cơ chế deploy key sẵn có.
Sau đó:

```bash
cd /var/discourse
./launcher rebuild app
```

Tên container nếu không phải `app` thì dùng tên thực tế.

### Cài thử bằng thư mục local (không dùng làm cấu hình deploy lâu dài)

Với môi trường development/source checkout, copy thư mục plugin vào
`DISCOURSE_SOURCE/plugins/discourse-ui-anonymous-categories`, restart server
và frontend dev server. Đường dẫn source là checkout Discourse thật của bạn.

Discourse managed hosting chỉ cài được nếu gói hosting cho phép custom plugin.

## Phạm vi UI, không phải bảo vệ danh tính

JSON/API, DOM data attributes, HTML/raw/quote metadata, profile/activity,
search, notifications, email/digest, RSS, revision history, nội dung tự gõ
như @mention/chữ ký và danh sách người like vẫn có thể hiện tài khoản thật.
Các plugin riêng (Reactions, Topic List Previews, signature, chat...) có thể
có giao diện riêng cần chỉnh bổ sung. Không hứa che danh tính ở các bề mặt này.
Theme/component khác có thể thêm tác giả ở vị trí ngoài giao diện chuẩn.

Không dùng bản này nếu cần cam kết giữ bí mật danh tính với người biết kỹ thuật.
Di chuyển topic ra khỏi category đã chọn sẽ hiện lại tác giả sau reload.
Soft-delete không đổi số; xóa vĩnh viễn bài đầu tiên của một tác giả có thể
đổi số của người đó. Sau khi chuyển category hoặc đổi settings, hãy reload
các tab đang mở để cập nhật nhất quán.

## Tương thích và kiểm tra

Các API/outlet đã được đối chiếu với mã nguồn **Discourse v2026.1.4**:
`post-avatar`, `post-meta-data-poster-name`, `post-meta-data-reply-to-tab-info`,
`topic-list-item-mobile-avatar`, `topic-list-item-class`,
`addPostClassesCallback`, `addTrackedPostProperties`, `decorateCookedElement`.

Mã nguồn tham chiếu: [Discourse v2026.1.4](https://github.com/discourse/discourse/tree/v2026.1.4).
Các phiên bản cũ hơn không thuộc mục tiêu của bản này.

Kiểm tra helper frontend, không cần dependencies:

```bash
npm test
```

Trong checkout Discourse có đầy đủ Ruby/bundle/database:

```bash
LOAD_PLUGINS=1 bundle exec rspec plugins/discourse-ui-anonymous-categories/spec
```

Đã chạy khi tạo gói: **9/9 kiểm tra Node đạt**; cú pháp JavaScript,
GJS/Glimmer template, Ruby và YAML hợp lệ; SCSS compile thành công.
Kiểm tra cú pháp Ruby bằng parser, chưa chạy Ruby runtime.

Các spec Rails được cung cấp để chạy trong Discourse; chưa chạy trên server
Discourse thật trong môi trường tạo gói. Chưa xác nhận tích hợp/theme mobile
bằng trình duyệt. Không coi bản 0.1.0 là đã kiểm thử production.

### Kiểm tra nhanh sau khi cài

1. Chọn category thử; dùng hai tài khoản A/B đăng topic và vài reply xen kẽ.
2. Kiểm tra tên/avatar/Chủ thớt; bấm tên và avatar không mở user card.
3. Reply vào bài của B; tên reply phải là bí danh, nút mở reply vẫn hoạt động.
4. Quote một bài; header quote không còn tên/avatar thật.
5. Xem Latest, category và mobile: không còn avatar người đăng ở các topic được chọn.
6. Vào category khác và quay lại: hiển thị thật/ẩn danh đúng phạm vi.
7. Thử bài cũ, bài bị soft-delete, reply mới nhận realtime, quyền sửa/xóa/flag.
8. Thử các theme/component/plugin đang bật riêng trên forum MPS.
9. Tắt plugin, reload: tác giả thật hiện lại và ownership giữ nguyên.

## License

MIT, xem LICENSE.
