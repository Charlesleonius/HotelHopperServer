pipeline {
  agent {
    label 'slave'
  }
  stages {
    stage('Install Dependencies') {
      steps {
        nodejs('HotelHopper') {
          sh '''npm install
'''
        }

      }
    }
    stage('Run Tests') {
      steps {
        sh 'npm run test-jenkins'
        archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
        junit 'test-result/result.xml'
      }
    }
  }
  environment {
    HOME = '.'
    MONGO_URI = 'mongodb://localhost:27017/hotelHopperDB'
  }
}