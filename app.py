## C3D Handler ##
import c3d

def extract(file_name):
    path = 'uploads/' + file_name

    header = c3d.Header(open(path, 'rb'))
    frame_rate = header.frame_rate

    reader = c3d.Reader(open(path, 'rb'))
    frames = []
    for i, points, analog in reader.read_frames():
        tmp = points[points[:, 4] > -1]                 # 쓰레기값(포인트) 제거
        result = tmp[:, :3]                             # x, y, z 좌표만 담는다.
        frames.append(result.tolist())

    return frame_rate, frames

## Flask ##
from flask import Flask, render_template, request, send_file
from werkzeug.utils import secure_filename
import os

app = Flask(__name__,
            static_url_path='',
            static_folder='static',
            template_folder='templates')   # Flask 객체 인스턴스 생성

@app.route('/') # 접속하는 url
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST']) # 접속하는 url
def upload_file():  # 동시에 이름이 같은 파일을 2개 이상 업로드 하는 경우 문제 발생 (해결방법?)
    if request.method == 'POST':
        f = request.files['file']
        # 저장할 경로 + 파일명
        f.save(os.path.join("uploads", secure_filename(f.filename)))
        frame_rate, frames = extract(f.filename)
        data = {'frame_rate': frame_rate,
                'frames': frames}
        return data

@app.route('/download', methods=['POST']) # 접속하는 url
def download_sample_file():
    sample_file = "sample.c3d"
    return send_file(sample_file, attachment_filename=sample_file, as_attachment=True)

if __name__ == "__main__":
    # 서버 실행
    app.run(debug=True)
    # host 등을 직접 지정하고 싶다면
    # app.run(host="127.0.0.1", port="5000", debug=True)