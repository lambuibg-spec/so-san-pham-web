# so-san-pham — bộ dựng trang Sổ sản phẩm (kho công khai, không chứa dữ liệu sổ)

Từ 04/11/2026 trang sổ nằm trên **Cloudflare Pages, khoá bằng gmail (Cloudflare Access)**: chỉ gmail có trong danh sách mới mở được.

- Kho này chỉ có code dựng. Dữ liệu sổ (mẫu trang, thẻ, ảnh) nằm ở kho riêng tư `so-san-pham-kho`; sổ gốc, phiếu quay ở kho luật riêng tư.
- `build.yml` (dung-web-tu-git): dựng trang từ git → tách ảnh ra file (`tools/tach_file.py`) → **cửa chặn**: trang Cloudflare chưa khoá thì chỉ đăng trang "đang khoá", không đăng dữ liệu thật → đăng Cloudflare Pages.
- `giam-sat.yml`: Firebase ↔ git, lần dựng gần nhất, trang còn khoá gmail không, phiếu quay đúng luật Sheet.
- Secrets cần: `KHO_TOKEN` (đọc kho luật + kho code, đọc/ghi `so-san-pham-kho`), `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit), `CLOUDFLARE_ACCOUNT_ID`.
- Log công khai: không in mã hay tên sản phẩm.
