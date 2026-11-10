Run `.\backend\dependencies.ps1` and `.\backend\photo-dependencies.ps1` from the project root. `run.ps1` invokes both before building. The scripts reuse existing verified files, download missing files from Maven Central and verify pinned SHA-256 checksums. JARs stay ignored by Git.

Runtime dependencies are pgJDBC 42.7.8 and six TwelveMonkeys ImageIO 3.15.0 modules for WebP photo decoding. Compilation requires only JDK 21; JPEG/PNG decoding uses the JDK. See [attachment setup and licensing](../../docs/photo-attachments.md).
