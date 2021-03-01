## C3D Handler ##
import c3d

file_name = 'Trial02.c3d'
path = 'dataset/' + file_name

header = c3d.Header(open(path, 'rb'))
frame_rate = header.frame_rate

reader = c3d.Reader(open(path, 'rb'))

frames = []
for i, points, analog in reader.read_frames():
    tmp = points[points[:, 4] > -1]                 # 쓰레기값(포인트) 제거
    result = tmp[:, :3]                             # x, y, z 좌표만 담는다.
    frames.append(result.tolist())

## Flask ##
from flask import Flask, render_template

app = Flask(__name__)   # Flask 객체 인스턴스 생성

@app.route('/') # 접속하는 url
def index():
    return render_template('test.html', frame_rate=frame_rate, frames=frames)

if __name__ == "__main__":
    app.run(debug=True)
    # host 등을 직접 지정하고 싶다면
    # app.run(host="127.0.0.1", port="5000", debug=True)